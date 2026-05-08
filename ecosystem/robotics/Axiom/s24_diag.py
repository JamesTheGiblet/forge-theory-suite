#!/usr/bin/env python3
"""
================================================================================
  GIBLETS CREATIONS - S24 ULTRA CLI DIAGNOSTIC
  Run in Termux - no app install needed
  Usage: python3 s24_diag.py
================================================================================
"""

import subprocess
import sys
import os
import re
from datetime import datetime

# ── Colour codes ──────────────────────────────────────────────────────────────
G  = "\033[92m"   # bright green
Y  = "\033[93m"   # yellow
C  = "\033[96m"   # cyan
R  = "\033[91m"   # red
DIM = "\033[2m"
B  = "\033[1m"
RST = "\033[0m"

# ── Output accumulator ────────────────────────────────────────────────────────
log_lines = []

def p(text="", colour=G):
    """Print coloured to terminal and save plain to log."""
    print(f"{colour}{text}{RST}")
    log_lines.append(text)

def h1(title):
    p()
    p("=" * 66, C)
    p(f"  {title}", C + B)
    p("=" * 66, C)

def h2(title):
    p()
    p(f"  ┌─ {title} {'─' * max(0, 54 - len(title))}", Y)

def row(label, value, w=22):
    p(f"  │  {label:<{w}} {value}")

def ok(label, value, w=22):
    p(f"  │  {label:<{w}} {G}✓ {value}{RST}", G)

def warn(msg):
    p(f"  │  ⚠  {msg}", Y)

def err(msg):
    p(f"  │  ✗  {msg}", R)

def run(cmd, timeout=15):
    """Run shell command, return stdout string or None."""
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True,
                           text=True, timeout=timeout)
        return r.stdout.strip() if r.returncode == 0 else None
    except Exception:
        return None

def run_raw(cmd, timeout=15):
    """Run shell command, return (stdout, stderr, returncode)."""
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True,
                           text=True, timeout=timeout)
        return r.stdout.strip(), r.stderr.strip(), r.returncode
    except Exception as e:
        return None, str(e), -1

# ── ADB shell wrapper (tries local adb first, then termux-adb) ───────────────
def adb(cmd, timeout=20):
    out, err_s, rc = run_raw(f"adb shell {cmd}", timeout)
    if rc == 0 and out:
        return out
    # Fallback: direct shell (works if running inside Termux on-device)
    out2, _, rc2 = run_raw(cmd, timeout)
    return out2 if rc2 == 0 else None

# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 1: DEVICE INFO
# ══════════════════════════════════════════════════════════════════════════════
def section_device():
    h1("DEVICE INFORMATION")

    fields = [
        ("Model",        "getprop ro.product.model"),
        ("Device",       "getprop ro.product.device"),
        ("Brand",        "getprop ro.product.brand"),
        ("Android",      "getprop ro.build.version.release"),
        ("SDK",          "getprop ro.build.version.sdk"),
        ("Build",        "getprop ro.build.display.id"),
        ("Kernel",       "uname -r"),
        ("CPU ABI",      "getprop ro.product.cpu.abi"),
        ("RAM",          "cat /proc/meminfo | grep MemTotal"),
        ("Uptime",       "uptime -p"),
    ]

    for label, cmd in fields:
        val = run(cmd)
        if val:
            row(label, val)
        else:
            warn(f"{label}: not available")

# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 2: CAMERA ENUMERATION via /sys and dumpsys
# ══════════════════════════════════════════════════════════════════════════════
def section_cameras():
    h1("CAMERA SUBSYSTEM")

    # ── Try dumpsys camera ───────────────────────────────────────────────────
    h2("dumpsys camera (service overview)")
    dump = run("dumpsys camera 2>/dev/null | head -120")
    if dump:
        for line in dump.splitlines():
            p(f"  │  {line}", DIM + G)
    else:
        warn("dumpsys camera not accessible (needs adb or root)")

    # ── /sys/bus/i2c/devices sensor chips ────────────────────────────────────
    h2("Camera-related chips in /sys")
    i2c_out = run("ls /sys/bus/i2c/devices/ 2>/dev/null")
    if i2c_out:
        row("I2C devices", i2c_out[:80])

    # Probe known camera sensor nodes
    known_nodes = [
        "/sys/kernel/debug/camera",
        "/sys/kernel/debug/msm_vidc",
        "/proc/driver/camera",
        "/dev/camera",
        "/dev/v4l",
    ]
    for node in known_nodes:
        exists = run(f"ls {node} 2>/dev/null")
        if exists:
            ok(node, "present")

    # ── Camera IDs via Camera2 property dump ─────────────────────────────────
    h2("Camera2 via cmd media.camera")
    cam_list = run("cmd media.camera list 2>/dev/null")
    if cam_list:
        for line in cam_list.splitlines():
            p(f"  │  {line}")
    else:
        warn("cmd media.camera not accessible")

    # ── Try service call approach ─────────────────────────────────────────────
    h2("Camera service via service call")
    svc = run("service list 2>/dev/null | grep -i camera")
    if svc:
        for line in svc.splitlines():
            p(f"  │  {line}")
    else:
        warn("service list not accessible")

    # ── Camera2 characteristics via getprop ──────────────────────────────────
    h2("Camera-related system properties")
    cam_props = run("getprop 2>/dev/null | grep -i 'camera\\|cam\\|sensor\\|imx\\|s5k\\|gn\\|hp' | head -60")
    if cam_props:
        for line in cam_props.splitlines():
            p(f"  │  {line}", DIM + G)
    else:
        warn("No camera props found via getprop")

    # ── /proc/camera ─────────────────────────────────────────────────────────
    proc_cam = run("cat /proc/camera 2>/dev/null || cat /proc/driver/camera 2>/dev/null")
    if proc_cam:
        h2("/proc/camera")
        for line in proc_cam.splitlines()[:40]:
            p(f"  │  {line}")

    # ── Media codec list (reveals camera pipeline) ───────────────────────────
    h2("Media codecs (video encoders)")
    codecs = run("cmd media.player list-codecs 2>/dev/null | grep -i 'encoder\\|hevc\\|h264\\|raw' | head -20")
    if codecs:
        for line in codecs.splitlines():
            p(f"  │  {line}", DIM + G)

    # ── Known S928B camera sensor IDs from getprop ───────────────────────────
    h2("Known S928B sensor model properties")
    sensor_props = [
        "ro.vendor.camera.sensor.back",
        "ro.vendor.camera.sensor.front",
        "persist.vendor.camera.main.sensor",
        "vendor.camera.rear.sensor.name",
        "vendor.camera.front.sensor.name",
    ]
    found_any = False
    for prop in sensor_props:
        val = run(f"getprop {prop} 2>/dev/null")
        if val:
            ok(prop.split(".")[-1], val)
            found_any = True
    if not found_any:
        warn("Sensor name props not exposed (normal on OneUI)")

    # ── Attempt direct Camera2 Java probe via app-less approach ──────────────
    h2("Camera2 StreamConfig via logcat probe")
    p("  │  To get full Camera2 characteristics, run the DiagnosticActivity APK")
    p("  │  OR connect adb from PC:  adb shell am start -n com.giblets.telephomicroscope/.DiagnosticActivity")


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 3: SENSOR ENUMERATION via /sys
# ══════════════════════════════════════════════════════════════════════════════
def section_sensors():
    h1("SENSOR SUBSYSTEM")

    # ── /sys/bus/iio/devices ─────────────────────────────────────────────────
    h2("IIO (Industrial I/O) sensor devices")
    iio = run("ls /sys/bus/iio/devices/ 2>/dev/null")
    if iio:
        devices = iio.split()
        row("IIO devices found", str(len(devices)))
        for dev in devices:
            name = run(f"cat /sys/bus/iio/devices/{dev}/name 2>/dev/null")
            if name:
                ok(dev, name)
    else:
        warn("IIO bus not accessible")

    # ── /sys/bus/platform/drivers ─────────────────────────────────────────────
    h2("Platform sensor drivers")
    drivers = run("ls /sys/bus/platform/drivers/ 2>/dev/null | grep -i 'sensor\\|imu\\|gyro\\|accel\\|baro\\|mag\\|als\\|tof' 2>/dev/null")
    if drivers:
        for d in drivers.splitlines():
            p(f"  │    {d}")
    else:
        warn("Platform drivers not readable")

    # ── /proc/sensor_hub ─────────────────────────────────────────────────────
    sensor_hub = run("cat /proc/sensor_hub 2>/dev/null")
    if sensor_hub:
        h2("/proc/sensor_hub")
        for line in sensor_hub.splitlines()[:30]:
            p(f"  │  {line}")

    # ── Known sensor paths on Samsung ────────────────────────────────────────
    h2("Samsung sensor sysfs paths")
    samsung_paths = [
        ("/sys/class/sensors", "sensors class"),
        ("/sys/devices/platform/sensor_hub", "sensor hub"),
        ("/sys/kernel/debug/sensor", "sensor debug"),
        ("/proc/driver/stm_lsm6dsx", "STMicro IMU"),
        ("/sys/devices/platform/lsm6dso", "LSM6DSO"),
        ("/sys/devices/virtual/sensors", "virtual sensors"),
    ]
    for path, label in samsung_paths:
        val = run(f"ls {path} 2>/dev/null | head -5")
        if val:
            ok(label, path)
            for item in val.splitlines():
                p(f"  │      → {item}", DIM + G)

    # ── Barometer (lps22df) ───────────────────────────────────────────────────
    h2("Barometer lps22df (your BaroHear sensor)")
    baro_paths = [
        "/sys/devices/platform/lps22df",
        "/sys/bus/i2c/devices/*/lps22df",
        "/sys/bus/spi/devices/*/lps22df",
    ]
    baro_found = False
    for bp in baro_paths:
        out = run(f"ls {bp} 2>/dev/null")
        if out:
            ok("lps22df path", bp)
            baro_found = True
            # Try to read pressure
            pres = run(f"cat {bp}/iio:device*/in_pressure_raw 2>/dev/null")
            if pres:
                ok("Raw pressure", f"{pres} (counts)")

    if not baro_found:
        # Try finding it via IIO
        iio_baro = run("grep -r 'lps22' /sys/bus/iio/ 2>/dev/null | head -3")
        if iio_baro:
            ok("lps22 via IIO", iio_baro)
            baro_found = True

    if not baro_found:
        warn("lps22df not directly accessible (kernel abstracts it)")
        p("  │  Use Android SensorManager TYPE 6 (Pressure) in app")

    # ── Gyroscope live data check ─────────────────────────────────────────────
    h2("Gyroscope (LSM6DSV) sysfs probe")
    gyro_iio = run("find /sys/bus/iio/devices -name '*gyro*' 2>/dev/null | head -5")
    if gyro_iio:
        for g in gyro_iio.splitlines():
            ok("gyro node", g)
    else:
        warn("gyro IIO node not found (expected, Samsung locks these)")

    # ── Rear ALS (STK6D2X) ───────────────────────────────────────────────────
    h2("Rear ALS STK6D2X (TYPE 65577)")
    als_paths = run("find /sys -name '*stk*' -o -name '*als*' 2>/dev/null | grep -v proc | head -10")
    if als_paths:
        for a in als_paths.splitlines():
            p(f"  │    {a}", DIM + G)
    else:
        warn("STK6D2X not directly accessible")
        p("  │  This sensor sits near camera array - useful for illumination feedback")


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 4: TERMUX SENSOR LIVE READINGS
# ══════════════════════════════════════════════════════════════════════════════
def section_termux_sensors():
    h1("TERMUX SENSOR LIVE READINGS")

    # Check if termux-api is installed
    termux_api = run("which termux-sensor 2>/dev/null")
    if not termux_api:
        warn("termux-sensor not found")
        p("  │  Install with:  pkg install termux-api")
        p("  │  Also install:  Termux:API app from F-Droid")
        p("  │  Then re-run this script for live sensor data")
        return

    p("  │  termux-sensor found: " + termux_api)

    # List all available sensors
    h2("Available sensors via termux-sensor -l")
    sensor_list, serr, src = run_raw("termux-sensor -l 2>/dev/null", timeout=10)
    if sensor_list:
        for line in sensor_list.splitlines()[:50]:
            p(f"  │  {line}")
    else:
        warn(f"termux-sensor -l failed: {serr[:80] if serr else 'no output'}")

    # Single snapshot of key sensors
    h2("Snapshot: Pressure (barometer)")
    baro, _, brc = run_raw("termux-sensor -s 'lps22df Pressure' -n 1 2>/dev/null", timeout=8)
    if baro and brc == 0:
        ok("Pressure", baro[:120])
    else:
        baro2, _, _ = run_raw("termux-sensor -s 'Pressure' -n 1 2>/dev/null", timeout=8)
        if baro2:
            ok("Pressure (fallback)", baro2[:120])
        else:
            warn("Barometer read failed - check Termux:API permissions")

    h2("Snapshot: Accelerometer")
    accel, _, arc = run_raw("termux-sensor -s 'LSM6DSV Accelerometer' -n 1 2>/dev/null", timeout=8)
    if accel and arc == 0:
        ok("Accel", accel[:120])
    else:
        warn("Accelerometer read failed")

    h2("Snapshot: Gyroscope")
    gyro, _, grc = run_raw("termux-sensor -s 'LSM6DSO Gyroscope' -n 1 2>/dev/null", timeout=8)
    if gyro and grc == 0:
        ok("Gyro", gyro[:120])
    else:
        warn("Gyroscope read failed")


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 5: STORAGE & FILESYSTEM
# ══════════════════════════════════════════════════════════════════════════════
def section_storage():
    h1("STORAGE & BUILD ENVIRONMENT")

    h2("Disk space")
    df = run("df -h /sdcard /data $HOME 2>/dev/null")
    if df:
        for line in df.splitlines():
            p(f"  │  {line}")

    h2("Termux build tools")
    tools = [
        ("java",    "java -version 2>&1 | head -1"),
        ("javac",   "javac -version 2>&1"),
        ("gradle",  "gradle --version 2>/dev/null | head -1 || echo 'not in PATH'"),
        ("python",  "python3 --version 2>&1"),
        ("aapt2",   "aapt2 version 2>/dev/null || echo 'not found'"),
        ("adb",     "adb version 2>/dev/null | head -1 || echo 'not found'"),
        ("termux-sensor", "which termux-sensor 2>/dev/null || echo 'not installed'"),
        ("termux-camera-photo", "which termux-camera-photo 2>/dev/null || echo 'not installed'"),
    ]
    for name, cmd in tools:
        val = run(cmd)
        sym = ok if (val and "not" not in val.lower() and "error" not in val.lower()) else warn
        if val:
            row(name, val[:60])

    h2("Android SDK")
    sdk_root = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT") or run("echo $ANDROID_HOME")
    if sdk_root and os.path.exists(sdk_root):
        ok("SDK root", sdk_root)
        platforms = run(f"ls {sdk_root}/platforms/ 2>/dev/null")
        if platforms:
            row("Platforms", platforms)
        build_tools = run(f"ls {sdk_root}/build-tools/ 2>/dev/null")
        if build_tools:
            row("Build-tools", build_tools)
    else:
        warn("ANDROID_HOME not set or not found")
        p("  │  Expected: ~/android-sdk or ~/storage/shared/android-sdk")


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 6: MICROSCOPY CAPABILITY SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
def section_summary():
    h1("MICROSCOPY CAPABILITY ASSESSMENT")

    p()
    p(f"  {B}Camera ID:0  (Main / 200MP candidate){RST}", Y + B)
    p(f"  {'─'*54}", Y)
    p("  Pixel array:    UNKNOWN → run DiagnosticActivity APK to confirm")
    p("  Expected:       16384×12288 (201MP) with ULTRA_HIGH_RESOLUTION_SENSOR cap")
    p("  If confirmed:   ~4-5 µm/px at 10cm  (3× better than ID:2 today)")
    p("  RAW support:    Likely YES → unprocessed Bayer = maximum scientific value")
    p("  Gotcha:         Requires SENSOR_PIXEL_MODE_MAXIMUM_RESOLUTION mode")
    p("  Min focus:      10 diopters = 10cm  (same as ID:2 in practice)")
    p()
    p(f"  {B}Camera ID:2  (Current microscope, telephoto){RST}", G + B)
    p(f"  {'─'*54}", G)
    p("  Confirmed:      16.8 µm/px at 8×, 12.8cm  ← your best result")
    p("  Stitch:         688×453mm composite achieved")
    p("  Status:         Working instrument")
    p()
    p(f"  {B}Sensors of interest for microscopy{RST}", C + B)
    p(f"  {'─'*54}", C)

    sensors = [
        ("TYPE 6  lps22df",     "Pressure/baro", "BaroHear. Also detects micro-vibration during capture"),
        ("TYPE 4  LSM6DSO",     "Gyroscope",     "Already driving stitch guidance. FIFO for burst stabilise"),
        ("TYPE 1  LSM6DSV",     "Accelerometer", "Tap-to-capture trigger. Vibration filter before shot"),
        ("TYPE 65577 STK6D2X",  "Rear ALS",      "REAR-facing! Illumination feedback for torch auto-level"),
        ("TYPE 2  AKO9918",     "Magnetometer",  "Substrate material detection (ferrous samples)"),
        ("TYPE 25 Pick Up",     "Gesture",       "Auto-pause stitch when phone lifted"),
        ("TYPE 65648 Car Crash","Impact detect",  "Emergency capture abort on drop"),
    ]

    for stype, category, use in sensors:
        p()
        p(f"  ► {G}{stype}{RST}  [{category}]")
        p(f"    {DIM}{use}{RST}")

    p()
    p(f"  {B}Next recommended tests:{RST}", Y + B)
    p("  1. Deploy DiagnosticActivity.apk → confirm 200MP RAW capability")
    p("  2. termux-camera-photo -c 0 test.jpg → does ID:0 capture work from CLI?")
    p("  3. Test termux-sensor pressure readings → validate BaroHear pipeline")
    p("  4. Check if RAW DNG capture possible from Camera2 on ID:0")


# ══════════════════════════════════════════════════════════════════════════════
#  SAVE REPORT
# ══════════════════════════════════════════════════════════════════════════════
def save_report():
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Try to save to DCIM or Documents
    for base in [
        os.path.expanduser("~/storage/shared/Documents"),
        os.path.expanduser("~/storage/shared/DCIM"),
        os.path.expanduser("~"),
    ]:
        if os.path.isdir(base):
            path = os.path.join(base, f"S24Diag_{ts}.txt")
            try:
                with open(path, "w") as f:
                    f.write("\n".join(log_lines))
                print(f"\n{G}📄 Report saved: {path}{RST}")
                return
            except Exception as e:
                pass

    # Fallback to Termux home
    path = os.path.expanduser(f"~/S24Diag_{ts}.txt")
    with open(path, "w") as f:
        f.write("\n".join(log_lines))
    print(f"\n{G}📄 Report saved: {path}{RST}")


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print(f"\n{C}{'='*66}")
    print(f"  GIBLETS CREATIONS  |  S24 ULTRA DIAGNOSTIC  |  SM-S928B")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*66}{RST}\n")

    log_lines.append(f"S24 Ultra Diagnostic  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    section_device()
    section_cameras()
    section_sensors()
    section_termux_sensors()
    section_storage()
    section_summary()

    save_report()

    print(f"\n{C}Done. Check the summary above for next steps.{RST}\n")

