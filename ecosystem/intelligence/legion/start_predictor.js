const { PredictiveIntel } = require('./engine/predictive_intel');
const predictor = new PredictiveIntel();
predictor.start(60);
