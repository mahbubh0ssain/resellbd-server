const express = require("express");
const app = express();
var jwt = require("jsonwebtoken");
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Final assignment server is successfully");
});

//mongoDB
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@resell-bd.6rcesuv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const dbConnect = async () => {
  try {
    await client.connect();
    console.log("DB connected successfully.");
  } catch (err) {
    console.error(err);
  }
};
dbConnect();

// userCollection
const UsersCollection = client.db("Resell-BD").collection("usersCollection");

//save user  to DB
app.post("/createUser", async (req, res) => {
  try {
    const user = req.body;
    const result = await UsersCollection.insertOne(user);
    if (result) {
      res.send({
        success: true,
        data: result,
      });
    } else {
      res.send({
        success: false,
        message: "Data not found",
      });
    }
  } catch (err) {
    res.send({
      success: false,
      message: err.message,
    });
    console.error(err);
  }
});

app.get("/all-sellers", async (req, res) => {
  try {
    const result = await UsersCollection.find({ role: "seller" }).toArray();
    res.send(result);
  } catch (err) {
    console.log(err);
  }
});

app.get("/all-buyers", async (req, res) => {
  try {
    const result = await UsersCollection.find({ role: "buyer" }).toArray();
    res.send(result);
  } catch (err) {
    console.log(err);
  }
});

//category collection
const Categories = client.db("Resell-BD").collection("categories");

//get al category
app.get("/category", async (req, res) => {
  const result = await Categories.find({}).toArray();
  res.send(result);
});

// productsCollection
const ProductsCollection = client
  .db("Resell-BD")
  .collection("productsCollection");

//get all products
app.get("/products/:id", async (req, res) => {
  const { id } = req.params;
  const result = await ProductsCollection.find({ categoryId: id }).toArray();
  res.send(result);
});

//add product

app.post("/add-product", async (req, res) => {
  const product = req.body;
  const result = await ProductsCollection.insertOne(product);
  res.send(result);
});

//product by email for seller
app.get("/my-products", async (req, res) => {
  const email = req.query.email;
  console.log(email);
  const result = await ProductsCollection.find({
    sellerEmail: email,
  }).toArray();
  res.send(result);
});

//booking collection
const BookingCollection = client
  .db("Resell-BD")
  .collection("bookingCollection");

// post all booking
app.post("/bookings", async (req, res) => {
  const booking = req.body;
  const result = await BookingCollection.insertOne(booking);
  res.send(result);
});

//get all bookings
app.get("/bookings", async (req, res) => {
  const email = req.query.email;
  const result = await BookingCollection.find({
    buyerEmail: email,
  }).toArray();
  res.send(result);
});

//get single booking\
app.get("/dashboard/payment/:id", async (req, res) => {
  const id = req.params.id;
  const result = await BookingCollection.findOne({ _id: ObjectId(id) });
  res.send(result);
});

//stripe payment
app.post("/create-payment-intent", async (req, res) => {
  const price = req.body.productPrice;
  const amount = price * 100;
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "usd",
    payment_method_types: ["card"],
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

//payment collection
const PaymentsCollection = client
  .db("Resell-BD")
  .collection("paymentsCollection");

//payment info from client
app.post("/paymentInfo", async (req, res) => {
  const paymentInfo = req.body;
  const id = paymentInfo._id;
  const result = await PaymentsCollection.insertOne(paymentInfo);
  const update = {
    $set: { paid: true },
  };
  const updatebooking = await BookingCollection.updateOne(
    {
      _id: ObjectId(id),
    },
    update
  );
  res.send(result);
});

//sign token
app.get("/jwt", async (req, res) => {
  const email = req.query.email;
  const isExist = await UsersCollection.findOne({ email: email });
  if (isExist) {
    const token = jwt.sign({ email }, process.env.ACCESS_TOKEN);
    return res.send({ token });
  }
  return res.status(401).send({ message: "Access forbidden" });
});

app.listen(port, () => {
  console.log(`Final assignment server is running on port ${port}`);
});
