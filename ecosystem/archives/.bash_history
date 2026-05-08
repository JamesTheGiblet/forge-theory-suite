
cat > src/memory.h << 'EOF'
#ifndef MEMORY_H
#define MEMORY_H

#include <stdint.h>
#include <stdbool.h>

#define EWRAM_SIZE  0x40000   // 256KB
#define IWRAM_SIZE  0x8000    // 32KB
#define IO_SIZE     0x400
#define ROM_MAX     0x2000000  // 32MB max

typedef struct {
    uint8_t ewwram[EWRAM_SIZE];
    uint8_t iwram[IWRAM_SIZE];
    uint8_t io[IO_SIZE];
    uint8_t *rom;             // dynamically allocated
    uint32_t rom_size;
    
    bool rom_loaded;
} MemoryBus;

void memory_init(MemoryBus *mem);
void memory_free(MemoryBus *mem);
bool memory_load_rom(MemoryBus *mem, const char *path);
uint32_t memory_read32(MemoryBus *mem, uint32_t addr);
void memory_write32(MemoryBus *mem, uint32_t addr, uint32_t val);

#endif
EOF

cat > src/memory.c << 'EOF'
#include "memory.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void memory_init(MemoryBus *mem) {
    memset(mem->ewwram, 0, EWRAM_SIZE);
    memset(mem->iwram, 0, IWRAM_SIZE);
    memset(mem->io, 0, IO_SIZE);
    mem->rom = NULL;
    mem->rom_size = 0;
    mem->rom_loaded = false;
}

void memory_free(MemoryBus *mem) {
    if (mem->rom) free(mem->rom);
    mem->rom = NULL;
    mem->rom_loaded = false;
}

bool memory_load_rom(MemoryBus *mem, const char *path) {
    FILE *f = fopen(path, "rb");
    if (!f) return false;
    
    fseek(f, 0, SEEK_END);
    mem->rom_size = ftell(f);
    if (mem->rom_size > ROM_MAX) {
        fclose(f);
        return false;
    }
    fseek(f, 0, SEEK_SET);
    
    mem->rom = malloc(mem->rom_size);
    if (!mem->rom) {
        fclose(f);
        return false;
    }
    
    size_t read = fread(mem->rom, 1, mem->rom_size, f);
    fclose(f);
    
    if (read != mem->rom_size) {
        free(mem->rom);
        mem->rom = NULL;
        return false;
    }
    
    mem->rom_loaded = true;
    return true;
}

uint32_t memory_read32(MemoryBus *mem, uint32_t addr) {
    if (addr < 0x02000000) return 0;
    else if (addr < 0x02040000) {
        uint32_t offset = addr & (EWRAM_SIZE - 1);
        return *(uint32_t*)(mem->ewwram + offset);
    }
    else if (addr >= 0x03000000 && addr < 0x03008000) {
        uint32_t offset = addr & (IWRAM_SIZE - 1);
        return *(uint32_t*)(mem->iwram + offset);
    }
    else if (addr >= 0x08000000 && mem->rom_loaded) {
        uint32_t offset = addr & 0x01FFFFFF;
        if (offset + 3 < mem->rom_size) {
            return *(uint32_t*)(mem->rom + offset);
        }
    }
    return 0xDEADBEEF;
}

void memory_write32(MemoryBus *mem, uint32_t addr, uint32_t val) {
    if (addr < 0x02000000) return;
    else if (addr < 0x02040000) {
        uint32_t offset = addr & (EWRAM_SIZE - 1);
        *(uint32_t*)(mem->ewwram + offset) = val;
    }
    else if (addr >= 0x03000000 && addr < 0x03008000) {
        uint32_t offset = addr & (IWRAM_SIZE - 1);
        *(uint32_t*)(mem->iwram + offset) = val;
    }
    else if (addr >= 0x04000000 && addr < 0x04000400) {
        // ignore IO writes for now
    }
}
EOF

cat > src/main.c << 'EOF'
#include <SDL2/SDL.h>
#include <stdio.h>
#include <stdlib.h>
#include "memory.h"

#define SCREEN_W 240
#define SCREEN_H 160

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <rom.gba>\n", argv[0]);
        return 1;
    }
    
    MemoryBus mem;
    memory_init(&mem);
    if (!memory_load_rom(&mem, argv[1])) {
        fprintf(stderr, "Failed to load ROM: %s\n", argv[1]);
        memory_free(&mem);
        return 1;
    }
    printf("ROM loaded: %s (%u bytes)\n", argv[1], mem.rom_size);
    
    if (SDL_Init(SDL_INIT_VIDEO) < 0) {
        fprintf(stderr, "SDL_Init Error: %s\n", SDL_GetError());
        memory_free(&mem);
        return 1;
    }
    
    SDL_Window *win = SDL_CreateWindow("GBA Emulator",
                                       SDL_WINDOWPOS_CENTERED,
                                       SDL_WINDOWPOS_CENTERED,
                                       SCREEN_W * 3, SCREEN_H * 3,
                                       SDL_WINDOW_RESIZABLE);
    if (!win) {
        fprintf(stderr, "SDL_CreateWindow Error: %s\n", SDL_GetError());
        SDL_Quit();
        memory_free(&mem);
        return 1;
    }
    
    SDL_Renderer *ren = SDL_CreateRenderer(win, -1, SDL_RENDERER_ACCELERATED);
    if (!ren) {
        fprintf(stderr, "SDL_CreateRenderer Error: %s\n", SDL_GetError());
        SDL_DestroyWindow(win);
        SDL_Quit();
        memory_free(&mem);
        return 1;
    }
    
    int running = 1;
    SDL_Event e;
    int frame = 0;
    
    while (running) {
        while (SDL_PollEvent(&e)) {
            if (e.type == SDL_QUIT) running = 0;
            if (e.type == SDL_KEYDOWN && e.key.keysym.sym == SDLK_ESCAPE) running = 0;
        }
        
        frame++;
        SDL_SetRenderDrawColor(ren, frame % 256, (frame/2) % 256, (frame/4) % 256, 255);
        SDL_RenderClear(ren);
        
        if (mem.rom_loaded && mem.rom_size > 0xAC) {
            uint32_t *pixels = (uint32_t*)mem.rom;
            for (int y = 0; y < 20; y++) {
                for (int x = 0; x < 20; x++) {
                    uint32_t color = pixels[(y*20 + x) % (mem.rom_size/4)] & 0xFFFFFF;
                    SDL_SetRenderDrawColor(ren, (color>>16)&0xFF, (color>>8)&0xFF, color&0xFF, 255);
                    SDL_RenderDrawPoint(ren, x, y);
                }
            }
        }
        
        SDL_RenderPresent(ren);
        SDL_Delay(16);
    }
    
    SDL_DestroyRenderer(ren);
    SDL_DestroyWindow(win);
    SDL_Quit();
    memory_free(&mem);
    return 0;
}
EOF

make
at > Makefile << 'EOF'
CC = clang
CFLAGS = -O2 -Wall -Wextra -std=c99 -D_DEFAULT_SOURCE
LDFLAGS = -lSDL2 -lm

SRCDIR = src
BUILDDIR = build
TARGET = gba-emu

SOURCES = $(wildcard $(SRCDIR)/*.c)
OBJECTS = $(patsubst $(SRCDIR)/%.c, $(BUILDDIR)/%.o, $(SOURCES))

$(TARGET): $(OBJECTS)
mkdir -p $(BUILDDIR)
$(CC) $^ -o $@ $(LDFLAGS)

$(BUILDDIR)/%.o: $(SRCDIR)/%.c
mkdir -p $(BUILDDIR)
$(CC) $(CFLAGS) -c $< -o $@

clean:
rm -rf $(BUILDDIR) $(TARGET)

run: $(TARGET)
./$(TARGET) roms/test.gba

.PHONY: clean run
EOF

cat -A Makefile | head -15
pkg list-installed | grep sdl
pkg install x11-repo -y
pkg install sdl2 sdl2-image sdl2-mixer sdl2-ttf clang make -y
./gba-emu roms/your_rom.gba
ls -la
cd ~/gba-emu
rm Makefile
nano Makefile
nano src/memory.h
nano src/memory.c
nano src/main.c
cd roms
curl -L -o test.gba https://github.com/dbostow/gba-tests/raw/refs/heads/master/bin/cpu_test.gba
cd ..
make clean   # remove any previous failed attempts
make
./gba-emu roms/test.gba
export SDL_VIDEO_RENDERER=software
export LIBGL_ALWAYS_SOFTWARE=1
./gba-emu roms/test.gba
export SDL_VIDEODRIVER=x11
export SDL_VIDEO_RENDERER=software
./gba-emu roms/test.gba
cat > src/main.c << 'EOF'
#include <SDL2/SDL.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "memory.h"

#define SCREEN_W 240
#define SCREEN_H 160

// Convert 24-bit RGB to 16-bit RGB565 (GBA native format)
static inline uint16_t rgb888_to_rgb565(uint8_t r, uint8_t g, uint8_t b) {
    return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <rom.gba>\n", argv[0]);
        return 1;
    }

    MemoryBus mem;
    memory_init(&mem);
    if (!memory_load_rom(&mem, argv[1])) {
        fprintf(stderr, "Failed to load ROM: %s\n", argv[1]);
        memory_free(&mem);
        return 1;
    }
    printf("ROM loaded: %s (%u bytes)\n", argv[1], mem.rom_size);

    if (SDL_Init(SDL_INIT_VIDEO) < 0) {
        fprintf(stderr, "SDL_Init Error: %s\n", SDL_GetError());
        memory_free(&mem);
        return 1;
    }

    SDL_Window *win = SDL_CreateWindow("GBA Emulator",
                                       SDL_WINDOWPOS_CENTERED,
                                       SDL_WINDOWPOS_CENTERED,
                                       SCREEN_W * 3, SCREEN_H * 3,
                                       SDL_WINDOW_RESIZABLE);
    if (!win) {
        fprintf(stderr, "SDL_CreateWindow Error: %s\n", SDL_GetError());
        SDL_Quit();
        memory_free(&mem);
        return 1;
    }

    // Get the window surface (software rendering)
    SDL_Surface *screen = SDL_GetWindowSurface(win);
    if (!screen) {
        fprintf(stderr, "SDL_GetWindowSurface Error: %s\n", SDL_GetError());
        SDL_DestroyWindow(win);
        SDL_Quit();
        memory_free(&mem);
        return 1;
    }

    int running = 1;
    SDL_Event e;
    int frame = 0;

    while (running) {
        while (SDL_PollEvent(&e)) {
            if (e.type == SDL_QUIT) running = 0;
            if (e.type == SDL_KEYDOWN && e.key.keysym.sym == SDLK_ESCAPE) running = 0;
        }

        frame++;

        // Clear with a shifting color (software fill)
        uint8_t r = frame % 256;
        uint8_t g = (frame / 2) % 256;
        uint8_t b = (frame / 4) % 256;
        uint32_t color24 = (r << 16) | (g << 8) | b;

        // Lock surface for direct pixel access
        if (SDL_MUSTLOCK(screen)) SDL_LockSurface(screen);

        uint32_t *pixels = (uint32_t*)screen->pixels;
        int pitch_pixels = screen->pitch / sizeof(uint32_t);

        for (int y = 0; y < SCREEN_H * 3; y++) {
            for (int x = 0; x < SCREEN_W * 3; x++) {
                pixels[y * pitch_pixels + x] = color24;
            }
        }

        // Draw a 20x20 block from ROM data (interpreted as RGB888)
        if (mem.rom_loaded && mem.rom_size > 0xAC) {
            uint8_t *rom_bytes = mem.rom;
            for (int y = 0; y < 20; y++) {
                for (int x = 0; x < 20; x++) {
                    int idx = (y * 20 + x) * 3; // 3 bytes per pixel RGB
                    idx = idx % (mem.rom_size - 3);
                    uint8_t rr = rom_bytes[idx];
                    uint8_t gg = rom_bytes[idx+1];
                    uint8_t bb = rom_bytes[idx+2];
                    uint32_t col = (rr << 16) | (gg << 8) | bb;
                    // Draw a 3x3 block at scaled coordinates to make it visible
                    for (int dy = 0; dy < 3; dy++) {
                        for (int dx = 0; dx < 3; dx++) {
                            int sx = x * 3 + dx;
                            int sy = y * 3 + dy;
                            if (sx < SCREEN_W * 3 && sy < SCREEN_H * 3)
                                pixels[sy * pitch_pixels + sx] = col;
                        }
                    }
                }
            }
        }

        if (SDL_MUSTLOCK(screen)) SDL_UnlockSurface(screen);
        SDL_UpdateWindowSurface(win);

        SDL_Delay(16);
    }

    SDL_DestroyWindow(win);
    SDL_Quit();
    memory_free(&mem);
    return 0;
}
EOF

make clean
make
./gba-emu roms/test.gba
pkg install x11-repo termux-x11-nightly
termux-x11 &
export DISPLAY=:0
./gba-emu roms/test.gba
cd /storage/emulated/0/Download/UBVM_phase0
python3 ubvm boot
python3 ubvm schedule   # then in another session: python3 ubvm boot
exit
cd /storage/emulated/0/Download/UBVM_phase0
git pull
chmod +x termux-start.sh termux-finish.sh
./tremux-finish.sh
git pull
./tremux-finish.sh
ls
./termux-finish.sh
chmod +x termux-start.sh termux-finish.sh
./termux-finish.sh
exit
cd ..
#!/bin/sh
SOURCE="JamesTheGiblet"
ORG="Forge-Theory-Labs"
# --- MAP OF OLD → NEW NAMES ---
# Add entries here as needed
RENAME_MAP="
sotos-mk1:Kraken-Intelligence
3d-storage-cube:Data-Cube
"
echo "=== Forge Theory Labs — Auto Rename + Transfer Engine ==="
echo ""
SUCCESS=0
SKIPPED=0
RENAMED=0
FAILED=0
# --- PROCESS EACH RENAME RULE ---
echo "Processing rename + transfer rules..."
echo ""
echo "$RENAME_MAP" | while IFS=":" read -r OLD NEW; do     [ -z "$OLD" ] && continue;      echo "→ Checking $OLD ..."; 
    if gh api "/repos/$ORG/$NEW" >/dev/null 2>&1; then         echo "   ✔ Already in organisation as $NEW — skipping";         SKIPPED=$((SKIPPED+1));         echo "";         continue;     fi; 
    if ! gh api "/repos/$SOURCE/$OLD" >/dev/null 2>&1; then         echo "   ✖ Repo $OLD not found under $SOURCE — skipping";         FAILED=$((FAILED+1));         echo "";         continue;     fi; 
    if [ "$OLD" != "$NEW" ]; then         echo "   → Renaming $OLD → $NEW ...";         RENAME_RESULT=$(gh api \
            --method PATCH \
            -H "Accept: application/vnd.github+json" \
            "/repos/$SOURCE/$OLD" \
            -f name="$NEW" 2>&1);          if echo "$RENAME_RESULT" | grep -q '"full_name"'; then             echo "     ✔ Renamed successfully";             RENAMED=$((RENAMED+1));         else             echo "     ✖ Rename failed: $RENAME_RESULT";             FAILED=$((FAILED+1));             echo "";             continue;         fi;     fi; 
    echo "   → Transferring $NEW to $ORG ...";     TRANSFER_RESULT=$(gh api \
        --method POST \
        -H "Accept: application/vnd.github+json" \
        "/repos/$SOURCE/$NEW/transfer" \
        -f new_owner="$ORG" \
        -f new_owner_type=organization 2>&1);      if echo "$TRANSFER_RESULT" | grep -q '"full_name"'; then         echo "     ✔ Transfer accepted";         SUCCESS=$((SUCCESS+1));     elif echo "$TRANSFER_RESULT" | grep -q "cannot be transferred to the original owner"; then         echo "     ✔ Already transferred earlier — treating as success";         SUCCESS=$((SUCCESS+1));     else         echo "     ✖ Transfer failed: $TRANSFER_RESULT";         FAILED=$((FAILED+1));     fi;      echo ""; done
echo "=== Migration Complete ==="
echo "Renamed: $RENAMED"
echo "Transferred: $SUCCESS"
echo "Skipped (already in org): $SKIPPED"
echo "Failed: $FAILED"
#!/bin/sh
SOURCE="JamesTheGiblet"
ORG="Forge-Theory-Labs"
# Map of old → new names
RENAME_MAP="
sotos-mk1:Kraken-Intelligence
3d-storage-cube:Data-Cube
"
# Temp state file
STATE=$(mktemp)
echo "SUCCESS=0"   > "$STATE"
echo "SKIPPED=0"  >> "$STATE"
echo "RENAMED=0"  >> "$STATE"
echo "FAILED=0"   >> "$STATE"
echo "=== Forge Theory Labs — Auto Rename + Transfer Engine ==="
echo ""
echo "Processing rename + transfer rules..."
echo ""
# Read rename map safely
printf "%s" "$RENAME_MAP" | while IFS=":" read -r OLD NEW; do     [ -z "$OLD" ] && continue;      echo "→ Checking $OLD ..."; 
    . "$STATE"; 
    if gh api "/repos/$ORG/$NEW" >/dev/null 2>&1; then         echo "   ✔ Already in organisation as $NEW — skipping";         SKIPPED=$((SKIPPED+1));         echo "SKIPPED=$SKIPPED" > "$STATE.tmp";         echo "SUCCESS=$SUCCESS" >> "$STATE.tmp";         echo "RENAMED=$RENAMED" >> "$STATE.tmp";         echo "FAILED=$FAILED"   >> "$STATE.tmp";         mv "$STATE.tmp" "$STATE";         echo "";         continue;     fi; 
    if ! gh api "/repos/$SOURCE/$OLD" >/dev/null 2>&1; then         echo "   ✖ Repo $OLD not found under $SOURCE — skipping";         FAILED=$((FAILED+1));         echo "FAILED=$FAILED" > "$STATE.tmp";         echo "SUCCESS=$SUCCESS" >> "$STATE.tmp";         echo "RENAMED=$RENAMED" >> "$STATE.tmp";         echo "SKIPPED=$SKIPPED" >> "$STATE.tmp";         mv "$STATE.tmp" "$STATE";         echo "";         continue;     fi; 
    if [ "$OLD" != "$NEW" ]; then         echo "   → Renaming $OLD → $NEW ...";         RENAME_RESULT=$(gh api \
            --method PATCH \
            -H "Accept: application/vnd.github+json" \
            "/repos/$SOURCE/$OLD" \
            -f name="$NEW" 2>&1);          if echo "$RENAME_RESULT" | grep -q '"full_name"'; then             echo "     ✔ Renamed successfully";             RENAMED=$((RENAMED+1));         else             echo "     ✖ Rename failed: $RENAME_RESULT";             FAILED=$((FAILED+1));             echo "FAILED=$FAILED" > "$STATE.tmp";             echo "SUCCESS=$SUCCESS" >> "$STATE.tmp";             echo "RENAMED=$RENAMED" >> "$STATE.tmp";             echo "SKIPPED=$SKIPPED" >> "$STATE.tmp";             mv "$STATE.tmp" "$STATE";             echo "";             continue;         fi;     fi; 
    echo "   → Transferring $NEW to $ORG ...";     TRANSFER_RESULT=$(gh api \
        --method POST \
        -H "Accept: application/vnd.github+json" \
        "/repos/$SOURCE/$NEW/transfer" \
        -f new_owner="$ORG" \
        -f new_owner_type=organization 2>&1);      if echo "$TRANSFER_RESULT" | grep -q '"full_name"'; then         echo "     ✔ Transfer accepted";         SUCCESS=$((SUCCESS+1));     elif echo "$TRANSFER_RESULT" | grep -q "cannot be transferred to the original owner"; then         echo "     ✔ Already transferred earlier — treating as success";         SUCCESS=$((SUCCESS+1));     else         echo "     ✖ Transfer failed: $TRANSFER_RESULT";         FAILED=$((FAILED+1));     fi; 
    echo "SUCCESS=$SUCCESS" > "$STATE.tmp";     echo "SKIPPED=$SKIPPED" >> "$STATE.tmp";     echo "RENAMED=$RENAMED" >> "$STATE.tmp";     echo "FAILED=$FAILED"   >> "$STATE.tmp";     mv "$STATE.tmp" "$STATE";      echo ""; done
# Final counters
. "$STATE"
rm "$STATE"
echo "=== Migration Complete ==="
echo "Renamed: $RENAMED"
echo "Transferred: $SUCCESS"
echo "Skipped (already in org): $SKIPPED"
echo "Failed: $FAILED"
gh repo edit Forge-Theory-Labs/<repo>   --description "Short, high-signal one-liner"
gh repo edit Forge-Theory-Labs/UBVM-os   --description "Universal Behavioural Virtual Machine"
#!/bin/sh
ORG="Forge-Theory-Labs"
FILE="descriptions.txt"
if [ ! -f "$FILE" ]; then     echo "Missing descriptions.txt — create it first.";     exit 1; fi
cd ..
#!/bin/sh
ORG="Forge-Theory-Labs"
FILE="descriptions.txt"
if [ ! -f "$FILE" ]; then     echo "Missing descriptions.txt — create it first.";     exit 1; fi
