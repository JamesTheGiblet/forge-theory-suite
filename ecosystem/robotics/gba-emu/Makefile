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
