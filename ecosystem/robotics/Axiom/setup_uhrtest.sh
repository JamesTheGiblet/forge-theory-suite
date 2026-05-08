#!/bin/bash
# ============================================================
#  UHR Test App - Termux Project Scaffold
#  Run from ~/Axiom/:  bash setup_uhrtest.sh
# ============================================================

set -e
PROJECT="UHRTest"
PKG_PATH="com/giblets/uhrtest"

echo "=== Scaffolding $PROJECT ==="

# ── Create directory structure ───────────────────────────────
mkdir -p $PROJECT/app/src/main/java/$PKG_PATH
mkdir -p $PROJECT/app/src/main/res/values

# ── settings.gradle ──────────────────────────────────────────
cat > $PROJECT/settings.gradle << 'EOF'
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "UHRTest"
include ':app'
EOF

# ── root build.gradle ─────────────────────────────────────────
cat > $PROJECT/build.gradle << 'EOF'
plugins {
    id 'com.android.application' version '8.2.0' apply false
    id 'org.jetbrains.kotlin.android' version '1.9.22' apply false
}
EOF

# ── gradle.properties ─────────────────────────────────────────
cat > $PROJECT/gradle.properties << 'EOF'
android.useAndroidX=true
kotlin.code.style=official
android.aapt2FromMavenOverride=/data/data/com.termux/files/usr/bin/aapt2
org.gradle.jvmargs=-Xmx768m -XX:+HeapDumpOnOutOfMemoryError
EOF

# ── gradle wrapper ────────────────────────────────────────────
mkdir -p $PROJECT/gradle/wrapper
cat > $PROJECT/gradle/wrapper/gradle-wrapper.properties << 'EOF'
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.4-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
EOF

# Copy wrapper from existing project if available
if [ -f ~/Axiom/TelephotoMicroscope/gradlew ]; then
    cp ~/Axiom/TelephotoMicroscope/gradlew $PROJECT/gradlew
    cp ~/Axiom/TelephotoMicroscope/gradlew.bat $PROJECT/gradlew.bat 2>/dev/null || true
    mkdir -p $PROJECT/gradle/wrapper
    cp ~/Axiom/TelephotoMicroscope/gradle/wrapper/gradle-wrapper.jar \
       $PROJECT/gradle/wrapper/ 2>/dev/null || true
    echo "  ✓ Copied gradlew from TelephotoMicroscope"
else
    echo "  ⚠ No existing gradlew found - copy from your TelephotoMicroscope project:"
    echo "    cp ~/Axiom/TelephotoMicroscope/gradlew $PROJECT/"
    echo "    cp ~/Axiom/TelephotoMicroscope/gradle/wrapper/gradle-wrapper.jar $PROJECT/gradle/wrapper/"
fi

chmod +x $PROJECT/gradlew 2>/dev/null || true

# ── app/build.gradle ──────────────────────────────────────────
cat > $PROJECT/app/build.gradle << 'EOF'
plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace 'com.giblets.uhrtest'
    compileSdk 34

    defaultConfig {
        applicationId "com.giblets.uhrtest"
        minSdk 31
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }

    buildTypes {
        debug { minifyEnabled false }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }

    kotlinOptions { jvmTarget = '17' }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.core:core-ktx:1.12.0'
}
EOF

# ── AndroidManifest ───────────────────────────────────────────
cat > $PROJECT/app/src/main/AndroidManifest.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.giblets.uhrtest">
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="true" />
    <application
        android:allowBackup="false"
        android:label="UHR Test"
        android:theme="@style/Theme.AppCompat.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# ── strings.xml (minimal) ─────────────────────────────────────
cat > $PROJECT/app/src/main/res/values/strings.xml << 'EOF'
<resources>
    <string name="app_name">UHR Test</string>
</resources>
EOF

echo ""
echo "=== Directory structure created ==="
find $PROJECT -type f | sort

echo ""
echo "=== Next step ==="
echo "Copy MainActivity.kt into:"
echo "  $PROJECT/app/src/main/java/$PKG_PATH/MainActivity.kt"
echo ""
echo "Then build with:"
echo "  cd $PROJECT && ./gradlew assembleDebug --no-daemon"
echo ""
echo "APK will be at:"
echo "  $PROJECT/app/build/outputs/apk/debug/app-debug.apk"

