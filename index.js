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

// productsCollection
const ProductsCollection = client
  .db("Resell-BD")
  .collection("productsCollection");

//booking collection
const BookingCollection = client
  .db("Resell-BD")
  .collection("bookingCollection");

//payment collection
const PaymentsCollection = client
  .db("Resell-BD")
  .collection("paymentsCollection");

//advertise collection
const AdvertiseCollection = client
  .db("Resell-BD")
  .collection("advertiseCollection");

//advertise collection
const ReportedItemsCollection = client
  .db("Resell-BD")
  .collection("reportedItemsCollection");

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

// verify JWT
const verifyJWT = (req, res, next) => {
  const headerToken = req.headers.authorization;
  if (!headerToken) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = headerToken.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Access forbidden" });
    }
    req.decoded = decoded;
    next();
  });
};

//verifyAdmin
const verifyAdmin = async (req, res, next) => {
  const decodedEmail = req.decoded.email;
  const user = await UsersCollection.findOne({ email: decodedEmail });
  if (!user.admin) {
    return res.status(403).send({ message: "Access forbidden" });
  }
  next();
};

//get admin from DB
app.get("/admin", async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(403).send({ message: "Access forbidden" });
  }
  const result = await UsersCollection.findOne({ email: email });
  if (result) {
    res.send(result);
  }
});

//get seller from DB
app.get("/seller", async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(403).send({ message: "Access forbidden" });
  }
  const result = await UsersCollection.findOne({ email: email });
  if (result) {
    res.send(result);
  }
});

//get buyer from DB
app.get("/buyer", async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(403).send({ message: "Access forbidden" });
  }
  const result = await UsersCollection.findOne({ email: email });
  if (result) {
    res.send(result);
  }
});

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

// all sellers
app.get("/all-sellers", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const result = await UsersCollection.find({ role: "seller" }).toArray();
    res.send(result);
  } catch (err) {
    console.log(err);
  }
});

//verify seller
app.post("/verify-seller", verifyJWT, verifyAdmin, async (req, res) => {
  const email = req.query.email;

  const update = {
    $set: { verified: true },
  };

  const result = await UsersCollection.updateOne({ email: email }, update, {
    upsert: true,
  });

  const getSellerProducts = await ProductsCollection.find({
    sellerEmail: email,
  }).toArray();

  const updateMany = await ProductsCollection.updateMany(
    {
      sellerEmail: email,
    },
    {
      $set: { verified: true },
    },
    {
      upsert: true,
    }
  );
  res.send(result);
});

//delete seller
app.delete("/delete-seller", verifyJWT, verifyAdmin, async (req, res) => {
  const email = req.query.email;
  const result = await UsersCollection.deleteOne({ email: email });
  res.send(result);
});

// all buyers
app.get("/all-buyers", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const result = await UsersCollection.find({ role: "buyer" }).toArray();
    res.send(result);
  } catch (err) {
    console.log(err);
  }
});

//delete buyer
app.delete("/delete-buyer", verifyJWT, verifyAdmin, async (req, res) => {
  const email = req.query.email;
  const result = await UsersCollection.deleteOne({ email: email });
  res.send(result);
});

//category collection
const Categories = client.db("Resell-BD").collection("categories");

//get al category
app.get("/category", async (req, res) => {
  const result = await Categories.find({}).toArray();
  res.send(result);
});

//get all products
app.get("/products/:id", async (req, res) => {
  const { id } = req.params;
  const result = await ProductsCollection.find({
    categoryId: id,
    status: "unsold",
  }).toArray();
  res.send(result);
});

//add product
app.post("/add-product", verifyJWT, async (req, res) => {
  const product = req.body;
  const email = product.sellerEmail;

  const isVerified = await UsersCollection.findOne({ email: email });

  if (isVerified.verified) {
    product.verified = true;
  }

  const result = await ProductsCollection.insertOne(product);
  res.send(result);
});

//post reported items
app.post("/reported-items", async (req, res) => {
  const item = req.body;
  const result = await ReportedItemsCollection.insertOne(item);
  res.send(result);
});

//get reported items
app.get("/reported-items", verifyJWT, verifyAdmin, async (req, res) => {
  const result = await ReportedItemsCollection.find({}).toArray();
  res.send(result);
});

// delete report item
app.delete("/delete-report", verifyJWT, verifyAdmin, async (req, res) => {
  const id = req.query.id;
  const result = await ReportedItemsCollection.deleteOne({ id: id });

  const deleteFromProductCollection = await ProductsCollection.deleteOne({
    _id: ObjectId(id),
  });

  res.send(result);
});
//product by email for seller
app.get("/my-products", verifyJWT, async (req, res) => {
  const email = req.query.email;
  const decodedEmail = req.decoded.email;
  if (email !== decodedEmail) {
    res.status(403).send({ message: "Access forbidden" });
  }
  const result = await ProductsCollection.find({
    sellerEmail: email,
  }).toArray();
  res.send(result);
});

//delete product by seller
app.delete("/delete-product", verifyJWT, async (req, res) => {
  const id = req.query.id;

  const result = await ProductsCollection.deleteOne({ _id: ObjectId(id) });

  const deleteFromAdvertise = await AdvertiseCollection.deleteOne({ id: id });

  res.send(result);
});

// post all booking
app.post("/bookings", async (req, res) => {
  const booking = req.body;
  const result = await BookingCollection.insertOne(booking);
  res.send(result);
});

//get all bookings
app.get("/bookings", verifyJWT, async (req, res) => {
  const email = req.query.email;
  const decodedEmail = req.decoded.email;
  if (email !== decodedEmail) {
    return res.status(403).send({ message: "Access forb" });
  }
  const result = await BookingCollection.find({
    buyerEmail: email,
  }).toArray();
  res.send(result);
});

//get single booking\
app.get("/dashboard/payment/:id", async (req, res) => {
  const id = req.params.id;
  const result = await BookingCollection.findOne({ id: id });
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

//payment info from client
app.post("/paymentInfo", async (req, res) => {
  const paymentInfo = req.body;
  const id = paymentInfo.id;
  const result = await PaymentsCollection.insertOne(paymentInfo);

  const update = {
    $set: { paid: true },
  };

  const updatebooking = await BookingCollection.updateOne({ id: id }, update, {
    upsert: true,
  });

  const updateAdvertise = await AdvertiseCollection.deleteOne({ id: id });

  const updateStatus = await ProductsCollection.updateOne(
    { _id: ObjectId(id) },
    { $set: { status: "sold" } }
  );
  res.send(result);
});

//post advertise
app.post("/advertise", verifyJWT, async (req, res) => {
  const content = req.body;
  const result = await AdvertiseCollection.insertOne(content);
  res.send(result);
});

// get advertise
app.get("/advertise", async (req, res) => {
  const result = await AdvertiseCollection.find({}).toArray();
  res.send(result);
});

app.listen(port, () => {
  console.log(`Final assignment server is running on port ${port}`);
});
