require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");

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

    // get the services
    app.get("/services", async (req, res) => {
      const limit = parseInt(req.query?.limit);
      const que = {};
      const cursor = limit
        ? serviceCollection.find(que).limit(Math.round(limit))
        : serviceCollection.find(que);
      const services = await cursor.toArray();
      res.send(services);
    });
  } finally {
    //   await client.close();
  }
}
run().catch((err) => console.error(err));
app.listen(port, () => {
  console.log("Server is running on port - ", port);
});
