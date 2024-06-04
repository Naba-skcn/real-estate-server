const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

console.log(process.env.DB_PASS);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8bgsx7j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const propertyCollection = client.db('estatenestDB').collection('property');

    // Get properties for advertisement
    app.get('/property', async (req, res) => {
      const result = await propertyCollection.find().toArray();
      res.send(result);
    });

    // This should stay open and handle requests
    app.get('/', (req, res) => {
      res.send('Real estate server is running');
    });

    app.listen(port, () => {
      console.log(`Real Estate server is running on port: ${port}`);
    });

  } catch (error) {
    console.error(error);
  }
}

// Run the function
run().catch(console.dir);

// Properly close the client on process termination
process.on('SIGINT', async () => {
  await client.close();
  console.log('MongoClient disconnected on app termination');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await client.close();
  console.log('MongoClient disconnected on app termination');
  process.exit(0);
});
