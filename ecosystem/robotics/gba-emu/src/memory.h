#ifndef MEMORY_H
#define MEMORY_H

#include <stdint.h>
#include <stdbool.h>

#define EWRAM_SIZE  0x40000
#define IWRAM_SIZE  0x8000
#define IO_SIZE     0x400
#define ROM_MAX     0x2000000

typedef struct {
    uint8_t ewwram[EWRAM_SIZE];
    uint8_t iwram[IWRAM_SIZE];
    uint8_t io[IO_SIZE];
    uint8_t *rom;
    uint32_t rom_size;
    bool rom_loaded;
} MemoryBus;

void memory_init(MemoryBus *mem);
void memory_free(MemoryBus *mem);
bool memory_load_rom(MemoryBus *mem, const char *path);
uint32_t memory_read32(MemoryBus *mem, uint32_t addr);
void memory_write32(MemoryBus *mem, uint32_t addr, uint32_t val);

#endif
