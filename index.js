const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;

require("dotenv").config();
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

//user saved to DB
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
  console.log(result);
  res.send(result);
});

//single product
// app.get("/products/:id", async (req, res) => {
//   const id = req.params;
//   const result = await ProductsCollection.findOne({ _id: ObjectId(id) });
//   res.send(result);
// });

app.listen(port, () => {
  console.log(`Final assignment server is running on port ${port}`);
});
