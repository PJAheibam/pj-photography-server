require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

app.get("/", (req, res) => res.send("Server is running"));

const uri = `mongodb+srv://${process.env.DB_USER_ID}:${process.env.DB_USER_PASS}@cluster0.0hl8m1y.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).send({ message: "unauthorized-access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      res.status(404).send({ message: "forbidden-access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const serviceCollection = client.db("picturesque").collection("services");

    const articleCollection = client.db("picturesque").collection("articles");

    // get the services api
    app.get("/services", async (req, res) => {
      const limit = req.query.limit;
      const query = {};
      const cursor = limit
        ? serviceCollection.find(query).limit(Math.round(limit))
        : serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    // single service api
    app.get("/services/:id", async (req, res) => {
      const { id } = req.params;
      const query = {
        _id: ObjectId(id),
      };
      const service = await serviceCollection.findOne(query);

      res.send(service);
    });

    // blog posts api
    app.get("/articles", async (req, res) => {
      const query = {};
      const cursor = articleCollection.find(query);
      const articles = await cursor.toArray();
      res.send(articles);
    });

    // blog post api
    app.get("/articles/:id", async (req, res) => {
      //   console.log(req.params);
      const id = req.params.id;
      const query = {
        _id: ObjectId(id),
      };
      const article = await articleCollection.findOne(query);
      res.send(article);
    });

    // orders api
    app.get("/orders", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decoded = req.decoded;
      if (decoded !== email) {
        res.status(401).send({ message: "unauthorized-access" });
      }
    });

    // jwt api
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // add service api
    app.post("/services", async (req, res) => {
      const data = req.body;
      const result = await serviceCollection.insertOne(data);
      // console.log(result);
      if (result.acknowledged)
        res.status(200).send({ message: "Data added to server!" });
      else res.status(501).send({ message: "Error while adding data!" });
    });

    // add review
    app.patch("/services/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: false };
      const updateService = {
        $set: {
          reviews: data,
        },
      };
      const result = await serviceCollection.updateOne(
        filter,
        updateService,
        option
      );
      console.log(result, data);
      res.send(result);
    });
  } finally {
    //   await client.close();
  }
}
run().catch((err) => console.error(err));

app.listen(port, () => {
  console.log("Server is running on port - ", port);
});
