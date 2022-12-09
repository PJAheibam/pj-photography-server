require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");

// app.use(
//   cors({
//     origin: "*",
//     credentials: true,
//     optionsSuccessStatus: 200,
//   })
// );

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

app.get("/", (_req, res) => res.send("Server is running"));

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
    } else {
      // console.log("decoded", decoded);
      req.decoded = decoded;
      next();
    }
  });
}

async function run() {
  try {
    const serviceCollection = client.db("picturesque").collection("services");

    const articleCollection = client.db("picturesque").collection("articles");

    // get the services api
    app.get("/services", async (req, res) => {
      try {
        const limit = req.query.limit;
        const query = {};

        let cursor = null;
        if (limit) {
          cursor = serviceCollection.find(query).limit(Math.round(limit));
        } else cursor = serviceCollection.find(query);

        const services = await cursor.toArray();

        return res.send(services);
      } catch (err) {
        console.log(err);
        return res.sendStatus(500);
      }
    });

    // single service api
    app.get("/services/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = {
          _id: ObjectId(id),
        };

        let service = await serviceCollection.find(query).toArray();

        if (service.length !== 0) {
          const reviews = service.reviews.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);

            // descending order sort
            if (dateA < dateB) return 1;
            else if (dateA > dateB) return -1;
            else return 0;
          });
          service.reviews = reviews;
        }
        return res.send(service);
      } catch (err) {
        return res.sendStatus(500);
      }
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

    // user review api
    app.get("/reviews", verifyJWT, async (req, res) => {
      const uid = req.query.uid;
      if (req.decoded.uid === uid) {
        const cursor = serviceCollection.find({});
        const services = await cursor.toArray();
        const r = services.map((service) => {
          const found = service.reviews
            ? service.reviews.find((review) => review.uid === uid)
            : undefined;

          if (found === undefined) return found;
          return {
            ...found,
            image_url: service.image_url,
            service_name: service.name,
            service_id: service._id,
          };
        });
        const data = r.filter((item) => item !== undefined);
        // console.log(data);
        res.send({ reviews: data });
      } else res.send({ message: "Error" });
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
      else res.sendStatus(501);
    });

    // add review or remove review
    app.patch("/services/:id", async (req, res) => {
      const method = req.query.method;
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: false };
      const service = await serviceCollection.findOne(filter);
      const restReviews = service.reviews.filter(
        (item) => item.uid !== data.uid
      );
      // console.log(restReviews);

      if (method && method.toLowerCase() === "patch") {
        const updateService = {
          $set: {
            reviews: restReviews ? [data, ...restReviews] : [data],
          },
        };
        const result = await serviceCollection.updateOne(
          filter,
          updateService,
          option
        );
        // console.log(result, data);
        res.send(result);
      }
      // handles delete an item from reviews array
      else if (method && method.toLocaleLowerCase() === "remove") {
        const updateService = {
          $set: {
            reviews: [...restReviews],
          },
        };
        const result = await serviceCollection.updateOne(
          filter,
          updateService,
          option
        );
        console.log(result);
        res.send(result);
      } else return res.send("No Item Found To Delete");
    });
  } finally {
    //   await client.close();
  }
}
run().catch((err) => console.error(err));

app.listen(port, () => {
  console.log("Server is running on port - ", port);
});
