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
