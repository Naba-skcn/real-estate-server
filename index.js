const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

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
  console.log(user)
  const result = await userCollection.updateOne(query, updateDoc, options)
  res.send(result)
  console.log(result)
})
//create payment
app.post('/create-payment-intent', async (req, res) => {
  try {
      const { amount } = req.body; 
      const amountInCents = parseFloat(amount) * 100;

      if (isNaN(amountInCents) || amountInCents <= 0) {
          return res.status(400).send({ error: 'Invalid amount' });
      }

      const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'usd',
          payment_method_types: ['card']
      });
      res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).send({ error: 'Failed to create payment intent' });
  }
});

//Update status to Bought
app.post('/update-offer-status', async (req, res) => {
  const { offerId, transactionId } = req.body;

  try {
      const result = await offerCollection.updateOne(
          { _id: new ObjectId(offerId) },
          { $set: { status: 'Bought', transactionId: transactionId } }
      );

      if (result.modifiedCount === 1) {
          res.send({ message: 'Offer status updated to Bought' });
      } else {
          res.status(404).send({ message: 'Offer not found' });
      }
  } catch (error) {
      console.error('Error updating offer status:', error);
      res.status(500).send({ message: 'Failed to update offer status' });
  }
});

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
      verification_status: 'Pending',
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

// Get all properties
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
//get properties for a specific agent
app.get('/property/agent/:email', async (req, res) => {
  const agentEmail = req.params.email; 
  if (!agentEmail) {
    return res.status(400).send({ message: 'Agent email is required' });
  }

  const query = { agent_email: agentEmail };
  const properties = await propertyCollection.find(query).toArray();
  res.send(properties);
});
// Get properties for advertisement
app.get('/property', async (req, res) => {
  const result = await propertyCollection.find().toArray();
  res.send(result);
});





// Delete a property by ID
app.delete('/property/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await propertyCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      res.send({ message: 'Property successfully deleted' });
    } else {
      res.status(404).send({ message: 'Property not found' });
    }
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).send({ message: 'Failed to delete property', error });
  }
});


// Update a property by ID
app.patch('/property/:id', async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid property ID' });
  }
  const updateData = { ...req.body };
  delete updateData._id;

  try {
    const result = await propertyCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.modifiedCount === 1) {
      return res.send({ message: 'Property successfully updated' });
    } else {
      return res.status(404).send({ message: 'Property not found' });
    }
  } catch (error) {
    console.error('Error updating property:', error);
    return res.status(500).send({ message: 'Failed to update property', error });
  }
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

// Get reviews for a specific user
app.get('/reviews/user/:email', async (req, res) => {
  const { email } = req.params;
  const reviews = await reviewCollection.find({ userEmail: email }).toArray();
  res.send(reviews);
});

// Delete a review by ID
app.delete('/reviews/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await reviewCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      res.send({ message: 'Review successfully deleted' });
    } else {
      res.status(404).send({ message: 'Review not found' });
    }
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).send({ message: 'Failed to delete review', error });
  }
});

// Add offers
app.post('/offers', async (req, res) => {
  const offer = req.body;

  try {
      const result = await offerCollection.insertOne(offer);
      res.status(201).send(result);
  } catch (error) {
      console.error('Error adding offer:', error);
      res.status(500).send({ message: 'Failed to add offer. Please try again later.' });
  }
});

//get all offers or requested property for a specific agent
app.get('/offers/:email', async (req, res) => {
    const email = req.params.email
    const query = {agentEmail: email};
    const result = await offerCollection.find(query).toArray()
    res.send(result);
  
});

// Get offers for a specific property
app.get('/offers/:propertyId', async (req, res) => {
  const { propertyId } = req.params;
  const offers = await offerCollection.find({ propertyId }).toArray();
  res.send(offers);
});

// Update offer status
app.patch('/offers/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid offer ID' });
  }

  try {
    const result = await offerCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.modifiedCount === 1) {
      return res.send({ message: 'Offer successfully updated' });
    } else {
      return res.status(404).send({ message: 'Offer not found' });
    }
  } catch (error) {
    console.error('Error updating offer:', error);
    return res.status(500).send({ message: 'Failed to update offer', error });
  }
});

// Get all offers for a specific buyer
app.get('/buyer/offers/:email', async (req, res) => {
  const { email } = req.params;
  const offers = await offerCollection.find({ buyerEmail: email }).toArray();
  res.send(offers);
});

// sold-properties route
app.get('/sold-properties/:email', async (req, res) => {
    const { email } = req.params;
    const sold = await offerCollection.find({ agentEmail: email, status: 'Bought' }).toArray();
    res.send(sold);
  
});
// Add this route to calculate the total property sold amount for a specific agent
app.get('/total-sold-amount/:email', async (req, res) => {
  const { email } = req.params;
    const soldProperties = await offerCollection.find({ agentEmail: email, status: 'Bought' }).toArray();
    const totalSoldAmount = soldProperties.reduce((total, property) => total + property.offerAmount, 0);
    res.send({ totalSoldAmount });
});

    // Reject other offers for the same property when one is accepted
app.post('/offers/rejectOthers', async (req, res) => {
  const { propertyId, offerId } = req.body;

  try {
    const result = await offerCollection.updateMany(
      { propertyId: new ObjectId(propertyId), _id: { $ne: new ObjectId(offerId) } },
      { $set: { status: 'Rejected' } }
    );

    res.send({ message: 'Other offers for the property rejected', result });
  } catch (error) {
    console.error('Error rejecting other offers:', error);
    res.status(500).send({ message: 'Failed to reject other offers', error });
  }
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
