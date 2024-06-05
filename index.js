const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const wishlistCollection = client.db('estatenestDB').collection('wishlist');
    const reviewCollection = client.db('estatenestDB').collection('reviews');
    const userCollection = client.db('estatenestDB').collection('users');

    // Get properties for advertisement
    app.get('/property', async (req, res) => {
      const result = await propertyCollection.find().toArray();
      res.send(result);
    });

    // Get details of a specific property
    app.get('/property/:id', async (req, res) => {
      const { id } = req.params;
      const property = await propertyCollection.findOne({ _id: new ObjectId(id) });
      res.send(property);
    });

    // Add property to wishlist
    app.post('/wishlist', async (req, res) => {
      const wishlistItem = req.body;
      const result = await wishlistCollection.insertOne(wishlistItem);
      res.send(result);
    });

    // Get reviews for a property
    app.get('/property/:id/reviews', async (req, res) => {
      const { id } = req.params;
      const reviews = await reviewCollection.find({ propertyId: id }).toArray();
      res.send(reviews);
    });

    // Add a review for a property
    app.post('/property/:id/reviews', async (req, res) => {
      const { id } = req.params;
      const review = { ...req.body, propertyId: id };
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });
   

    // Get latest reviews
app.get('/reviews/latest', async (req, res) => {
  const reviews = await reviewCollection.find().sort({ _id: -1 }).limit(4).toArray();
  res.send(reviews);
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
