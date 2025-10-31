require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const userDB = client.db("userDataBase");
    const productsCollection = userDB.collection("products");
    ////////why///////////////////////////$$$$$$$$$$$$$$
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productsCollection.insetOne(newProduct);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.send("Server Running");
});
app.listen(port, () => {
  console.log("server running in port", port);
});
