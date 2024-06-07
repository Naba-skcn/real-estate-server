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
    const wishlistCollection = client.db('estatenestDB').collection('list');
    const reviewCollection = client.db('estatenestDB').collection('reviews');
    const offerCollection = client.db('estatenestDB').collection('offers');
    const userCollection = client.db('estatenestDB').collection('users');

// save a user data in db
app.put('/user', async (req, res) => {
  const user = req.body

  const query = { email: user?.email }
  // check if user already exists in db
  const isExist = await userCollection.findOne(query)
  if (isExist) {
    if (user.status === 'Requested') {
      // if existing user try to change his role
      const result = await userCollection.updateOne(query, {
        $set: { status: user?.status },
      })
      return res.send(result)
    } else {
      // if existing user login again
      return res.send(isExist)
    }
  }

  // save user for the first time
  const options = { upsert: true }
  const updateDoc = {
    $set: {
      ...user,
      timestamp: Date.now(),
    },
  }
  const result = await userCollection.updateOne(query, updateDoc, options)
  res.send(result)
})


 // get a user info by email from db
 app.get('/user/:email', async (req, res) => {
  const email = req.params.email
  const result = await userCollection.findOne({ email })
  res.send(result)
})

//update a user role
app.patch('/users/update/:email', async (req, res) => {
  const email = req.params.email
  const user = req.body
  const query = { email }
  const updateDoc = {
    $set: { ...user, timestamp: Date.now() },
  }
  const result = await userCollection.updateOne(query, updateDoc)
  res.send(result)
})

// get all users data from db
app.get('/users', async (req, res) => {
  const result = await userCollection.find().toArray()
  res.send(result)
})


// Get a specific user by email
app.get('/users/:email', async (req, res) => {
  const { email } = req.params;
  const user = await userCollection.findOne({ email });
  if (user) {
    res.send(user);
  } else {
    res.status(404).send({ message: 'User not found' });
  }
})

// Add a property
app.post('/property', async (req, res) => {
  try {
    const { property_image,  property_title, property_location, description, price_range, agent_name, agent_email, agent_image } = req.body;
    const newProperty = {
      property_title,
      property_location,
      description,
      price_range,
      verification_status: 'Verified',
      agent_name,
      agent_email,
      property_image,
      agent_image,
    };
    const result = await propertyCollection.insertOne(newProperty);
    return res.json(result);
  } catch (error) {
    console.error('Error adding property:', error);
    return res.status(500).json({ message: 'Failed to add property', error });
  }
})

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

    
        // Add to wishlist 
    app.post('/list', async (req, res) => {
      const wishlistItem = req.body;
      console.log('Adding to wishlist:', wishlistItem);
      const result = await wishlistCollection.insertOne(wishlistItem);
      res.send(result);
    });

    // Get user's wishlist
    app.get('/list/:email', async (req, res) => {
      try {
        const email = req.params.email
        const query = { userEmail : email };
            const result = await wishlistCollection.find(query).toArray();
            res.json(result);
      } catch (error) {
        console.error('Error fetching wishlist:', error);
        res.status(500).send('Internal Server Error');
      }
    });

     // Remove from wishlist
     app.delete('/list/:id', async (req, res) => {
      const { id } = req.params;
      const result = await wishlistCollection.deleteOne({ _id: new ObjectId(id) });
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

// Make an offer
app.post('/offers', async (req, res) => {
  const offer = req.body;
  const { propertyId, offerAmount } = offer;

  // Fetch property to get price range
  const property = await propertyCollection.findOne({ _id: new ObjectId(propertyId) });
  const [minPrice, maxPrice] = property.price_range.replace(/\$/g, '').split(' - ').map(Number);

  if (offerAmount < minPrice || offerAmount > maxPrice) {
    res.status(400).send({ message: 'Offer amount must be within the price range specified by the agent.' });
    return;
  }

  const result = await offerCollection.insertOne(offer);
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
