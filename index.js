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

async function run() {
  try {
    const serviceCollection = client.db("picturesque").collection("services");

    const articleCollection = client.db("picturesque").collection("articles");

    // // get the services
    app.get("/services", async (req, res) => {
      const limit = req.query.limit;
      const query = {};
      const cursor = limit
        ? serviceCollection.find(query).limit(Math.round(limit))
        : serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    // blog posts
    app.get("/articles", async (req, res) => {
      const query = {};
      const cursor = articleCollection.find(query);
      const articles = await cursor.toArray();
      res.send(articles);
    });

    // blog post
    app.get("/articles/:id", async (req, res) => {
      //   console.log(req.params);
      const id = req.params.id;
      const query = {
        _id: ObjectId(id),
      };
      const article = await articleCollection.findOne(query);
      res.send(article);
    });

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send(token);
    });
  } finally {
    //   await client.close();
  }
}
run().catch((err) => console.error(err));

app.listen(port, () => {
  console.log("Server is running on port - ", port);
});
