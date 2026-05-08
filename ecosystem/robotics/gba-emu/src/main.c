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
