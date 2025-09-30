
const express = require('express');
const crypto = require('crypto');

class Block {
  constructor(index, timestamp, data, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    const payload = this.index + this.timestamp + JSON.stringify(this.data) + this.previousHash + this.nonce;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  mineBlock(difficulty) {
    const target = '0'.repeat(difficulty);
    while (!this.hash.startsWith(target)) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
  }
}

class CentralBlockchain {
  constructor(difficulty = 3) {
    this.chain = [];
    this.difficulty = difficulty;
    // create genesis block
    this.setBlock('Genesis Block', true);
  }
  setBlock(data, skipMining = false) {
    const index = this.chain.length;
    const timestamp = new Date().toISOString();
    const previousHash = index === 0 ? '0' : this.getLatestBlock().hash;
    const block = new Block(index, timestamp, data, previousHash);

    if (!skipMining) {
      block.mineBlock(this.difficulty);
    }
    this.chain.push(block);
    return block;
  }

  getBlock(index) {
    if (index < 0 || index >= this.chain.length) return null;
    return this.chain[index];
  }

  blocksExplorer() {

    return this.chain.map(b => ({
      index: b.index,
      timestamp: b.timestamp,
      data: b.data,
      previousHash: b.previousHash,
      hash: b.hash,
      nonce: b.nonce
    }));
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  mineBlock(index) {
    const block = this.getBlock(index);
    if (!block) throw new Error('Block not found');

    block.nonce = 0;
    block.hash = block.calculateHash();
    block.mineBlock(this.difficulty);
    for (let i = index + 1; i < this.chain.length; i++) {
      this.chain[i].previousHash = this.chain[i - 1].hash;
      this.chain[i].nonce = 0;
      this.chain[i].hash = this.chain[i].calculateHash();
    }
    return block;
  }

  validateChain() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];
      if (current.hash !== current.calculateHash()) return false;
      if (current.previousHash !== previous.hash) return false;
    }
    return true;
  }
}

const app = express();
app.use(express.json());

const centralChain = new CentralBlockchain(3);
app.get('/blocks', (req, res) => {
  res.json({ chain: centralChain.blocksExplorer(), valid: centralChain.validateChain() });
});

app.get('/blocks/:index', (req, res) => {
  const idx = parseInt(req.params.index, 10);
  const block = centralChain.getBlock(idx);
  if (!block) return res.status(404).json({ error: 'Block not found' });
  res.json(block);
});
app.post('/blocks', (req, res) => {
  const { data } = req.body;
  if (typeof data === 'undefined') return res.status(400).json({ error: 'Missing data' });
  const block = centralChain.setBlock(data);
  res.status(201).json(block);
});
app.post('/mine/:index', (req, res) => {
  const idx = parseInt(req.params.index, 10);
  try {
    const block = centralChain.mineBlock(idx);
    res.json({ message: 'Block mined', block });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/validate', (req, res) => {
  res.json({ valid: centralChain.validateChain() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Central Blockchain server running on http://localhost:${PORT}`);
  console.log('Endpoints: GET /blocks, GET /blocks/:index, POST /blocks, POST /mine/:index, GET /validate');
});
