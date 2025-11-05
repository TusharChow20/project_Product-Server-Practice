require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
// const token = jwt.sign({ foo: 'bar' }, 'shhhhh');
const admin = require("firebase-admin");
const port = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;

// index.js
const decoded = Buffer.from(
  process.env.FIREBASE_SERVICE_KEY,
  "base64"
).toString("utf8");
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());

const firebaseToken = async (req, res, next) => {
  const autorize = req.headers.authorization;
  // console.log(req);

  if (!autorize) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const authSplit = autorize.split(" ")[1];
  console.log(authSplit);

  if (!authSplit) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  // console.log(authSplit);
  try {
    const userInfo = await admin.auth().verifyIdToken(authSplit);
    req.buyer_email = userInfo.email;
    // req_email = UserInfo.email
    // console.log(userInfo);

    next();
  } catch {
    return res.status(401).send({ message: "unauthorized access" });
  }

  // if
};
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  jwt.verify(token, process.env.JWT_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.buyer_email = decoded.email;
    next();
  });

  // next();
};
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // await client.connect();
    const userDB = client.db("userDataBase");
    const productsCollection = userDB.collection("products");
    const bidsCollection = userDB.collection("BidData");
    const userCollection = userDB.collection("users");

    //jwt
    app.post("/getToken", (req, res) => {
      const loggedUser = req.body;

      const token = jwt.sign(loggedUser, process.env.JWT_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      // console.log(token);

      res.send({ token: token });
    });

    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;
      const query = { email: email };

      const existingUser = await userCollection.findOne(query);
      // console.log(existingUser);
      if (existingUser) {
        return res.send({ message: "User already exists" });
      } else {
        const result = await userCollection.insertOne(newUser);
        res.send(result);
      }
    });
    app.get("/users", async (req, res) => {
      // console.log(req.query);
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      }
      const cursor = userCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/products", async (req, res) => {
      console.log(req.query);
      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      }
      const projectFeilds = { title: 1 };
      const cursor = productsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });
    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productsCollection.insertOne(newProduct);
      res.send(result);
    });

    app.get("/latest-products", async (req, res) => {
      const cursor = productsCollection
        .find()
        .sort({ created_at: -1 })
        .limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const updateProduct = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          name: updateProduct.name,
          price: updateProduct.price,
        },
      };
      const result = await productsCollection.updateOne(query, update);
      res.send(result);
    });

    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection

    app.get("/BidData", verifyJWT, async (req, res) => {
      // console.log(req.headers);

      const email = req.query.email;
      const query = {};
      console.log(email);

      if (email) {
        if (email !== req.buyer_email) {
          return res.status("403").send({ message: "forbidden access" });
        }
        query.buyer_email = email;
      }
      const cursor = bidsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/products/bids/:productID", firebaseToken, async (req, res) => {
      const productID = req.params.productID;
      console.log("Searching for productID:", productID);
      const query = {
        product: productID,
      };

      const cursor = bidsCollection.find(query).sort({ bid_price: -1 });
      const result = await cursor.toArray();
      console.log("Found bids:", result.length);
      res.send(result);
    });
    app.post("/BidData", async (req, res) => {
      const newBid = req.body;
      const result = await bidsCollection.insertOne(newBid);
      res.send(result);
    });
    app.delete("/BidData/:id", async (req, res) => {
      const userId = req.params.id;
      const query = { _id: new ObjectId(userId) };
      const result = await bidsCollection.deleteOne(query);
      res.send(result);
    });
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server Running");
});
app.listen(port, () => {
  console.log("server running in port", port);
});
