f = open('src/strategy.js', 'r')
c = f.read()
f.close()

# Only warn about zombies when price data has been fetched (price exists but is 0)
# Silent skip when price key simply doesn't exist yet (startup)
c = c.replace(
    """      const price = marketData[priceKey];
      if (!price || price <= 0 || isNaN(price)) {
        console.warn(`🧟 ZOMBIE DETECTED: ${asset} (No valid price data for key '${priceKey}')`);
        zombies.push(asset);
      }""",
    """      const price = marketData[priceKey];
      if (price !== undefined && (price <= 0 || isNaN(price))) {
        console.warn(`🧟 ZOMBIE DETECTED: ${asset} (Invalid price for key '${priceKey}')`);
        zombies.push(asset);
      } else if (price === undefined) {
        zombies.push(asset); // silently skip — data not yet fetched
      }"""
)

f = open('src/strategy.js', 'w')
f.write(c)
f.close()
print('done')
