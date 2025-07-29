const fs = require('fs');
const path = require('path');

const buildInfo = {
  timestamp: new Date().toISOString(),
  date: new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
};

fs.writeFileSync(
  path.join(__dirname, '../lib/build-info.json'),
  JSON.stringify(buildInfo, null, 2)
);

console.log('Build info generated:', buildInfo.date);