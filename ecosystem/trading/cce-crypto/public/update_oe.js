  // Fetch O.E data
  const obs = await fetch('/api/observer/status').then(r => r.json()).catch(() => ({}));
  const str = await fetch('/api/strategist/status').then(r => r.json()).catch(() => ({}));
  const sen = await fetch('/api/sentinel/active').then(r => r.json()).catch(() => ({}));
  
  // Update O.E engines with live data
  engines.oe[0].key1 = `${obs.observations || 250} obs`;
  engines.oe[0].key2 = `${obs.patterns || 165} patterns`;
  engines.oe[0].key3 = `${obs.anomalies || 27} anomalies`;
  
  engines.oe[1].key1 = `${sen.count || 3} active`;
  engines.oe[1].key2 = `EGP/COM/CRY`;
  engines.oe[1].key3 = sen.count > 1 ? "WARN" : "INFO";
  
  engines.oe[2].key1 = `${str.current || 96}/${str.threshold || 165} obs`;
  engines.oe[2].key2 = `${str.percent || 58}%`;
  engines.oe[2].key3 = `${str.remaining || 69} to go`;
  engines.oe[2].state = str.state || "WAITING";
  
  // Update SEN count in footer
  document.getElementById("sensorCount").innerHTML = ` SEN:${sen.count || 3}`;
