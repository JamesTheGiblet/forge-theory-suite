const readline = require('readline');
const { ChameleonRL } = require('../agents/chameleon_rl');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Load training curriculum
const curriculumPath = path.join(__dirname, '../scp/training.scp.json');
let curriculum = null;
try {
  curriculum = JSON.parse(fs.readFileSync(curriculumPath, 'utf8'));
  console.log(`📚 Loaded curriculum with ${curriculum.curriculum.modules.length} modules`);
} catch(e) {}

async function trainChameleon() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     🧠 CHAMELEON RL — REINFORCEMENT LEARNING TRAINING          ║');
  console.log('║   Neural network learns from your feedback in real-time!       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const chameleon = new ChameleonRL({}, null);
  
  console.log(`📊 Initial status:`);
  console.log(chameleon.getTrainingStatus());
  console.log('\nThis AI uses a neural network with reinforcement learning!');
  console.log('Each response trains the model based on your feedback.\n');
  
  let useCurriculum = false;
  if (curriculum) {
    console.log(`🎓 Found training curriculum with ${curriculum.curriculum.modules.length} modules`);
    const answer = await askQuestion('Run through curriculum first? (y/n): ');
    if (answer.toLowerCase() === 'y') {
      useCurriculum = true;
      await runCurriculum(chameleon);
    }
  }
  
  console.log('\n🔁 Entering interactive training mode...');
  console.log('Commands:');
  console.log('  • "status" - Show training metrics');
  console.log('  • "save" - Save model');
  console.log('  • "reset" - Reset model');
  console.log('  • "exit" - Exit\n');
  
  function chat() {
    rl.question('🧑 You: ', async (userInput) => {
      if (userInput.toLowerCase() === 'exit') {
        console.log(`\n📊 Final training status:`);
        console.log(chameleon.getTrainingStatus());
        chameleon.saveModel();
        console.log('\n✅ Model saved! Chameleon is trained.\n');
        rl.close();
        return;
      }
      
      if (userInput.toLowerCase() === 'status') {
        console.log('\n📊 Training Metrics:');
        console.log(chameleon.getTrainingStatus());
        console.log('');
        chat();
        return;
      }
      
      if (userInput.toLowerCase() === 'save') {
        chameleon.saveModel();
        console.log('💾 Model saved!\n');
        chat();
        return;
      }
      
      if (userInput.toLowerCase() === 'reset') {
        // Reset would require reinitializing
        console.log('⚠️ Reset not implemented in this demo\n');
        chat();
        return;
      }
      
      // Generate response using neural network
      const response = chameleon.generateResponse(userInput);
      console.log(`\n🦎 Chameleon: ${response}\n`);
      
      // Get feedback for reinforcement learning
      rl.question('Was this response helpful? (👍 y / 👎 n / ⏭️ s to skip): ', async (feedback) => {
        let feedbackType = null;
        if (feedback.toLowerCase() === 'y' || feedback === '👍') {
          feedbackType = 'positive';
          console.log('👍 Positive reinforcement! Adjusting weights...');
        } else if (feedback.toLowerCase() === 'n' || feedback === '👎') {
          feedbackType = 'negative';
          console.log('👎 Negative reinforcement. Adjusting weights...');
        } else {
          console.log('⏭️ Skipping feedback.\n');
          chat();
          return;
        }
        
        // Learn from feedback (REINFORCEMENT LEARNING!)
        const result = await chameleon.learn(userInput, response, feedbackType);
        console.log(`📈 Learning result: reward=${result.reward}, loss=${result.loss.toFixed(4)}, ε=${result.epsilon.toFixed(3)}\n`);
        
        chat();
      });
    });
  }
  
  chat();
}

async function runCurriculum(chameleon) {
  console.log('\n🎓 Running through training curriculum...\n');
  
  let trained = 0;
  for (const module of curriculum.curriculum.modules) {
    console.log(`\n📖 Module: ${module.name}`);
    console.log('─'.repeat(40));
    
    for (const item of module.questions) {
      // Generate response using neural network
      const response = chameleon.generateResponse(item.q, item.expected);
      
      // Train with the expected response (supervised learning)
      await chameleon.learn(item.q, response, 'positive', item.expected);
      
      trained++;
      process.stdout.write(`  ✅ ${trained}. ${item.q.substring(0, 50)}...\n`);
      await new Promise(r => setTimeout(r, 50)); // Small delay
    }
  }
  
  console.log(`\n✅ Curriculum complete! Trained on ${trained} examples.`);
  console.log(chameleon.getTrainingStatus());
}

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

trainChameleon();
