const { Reaper } = require('./agents/reaper');
const reaper = new Reaper();

console.log('Starting Reaper test...');
reaper.start(5000);

setTimeout(async () => {
  console.log('Stats after 15s:', reaper.getStats());
  const processes = await reaper.getProcessList();
  console.log('Found processes:', processes.length);
  processes.forEach(p => {
    console.log(`  PID ${p.pid}: CPU ${p.cpu}%, MEM ${p.mem_mb}MB - ${p.command}`);
  });
  reaper.stop();
  process.exit(0);
}, 15000);
