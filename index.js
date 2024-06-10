const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const port = process.env.PORT || 5000;

const app = express();
const corsOptions = {
  origin: ["https://naturenexus-232f7.firebaseapp.com/", "https://naturenexus-232f7.web.app"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.giatfyq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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

    const userCollection = client.db("NatureNexus").collection("users");
    const packegCollection = client.db("NatureNexus").collection("packegs");
    const bookingCollection = client.db("NatureNexus").collection("booking");
    const wishlistCollection = client.db("NatureNexus").collection("wishlist");
    const storyCollection = client.db("NatureNexus").collection("story");
    const tourTypeCollection = client.db("NatureNexus").collection("tourtype");

    // jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ token });
    });

    const verifyMiddleware = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get("/users", verifyMiddleware, verifyAdmin, async (req, res) => {
      const { filter, search } = req.query;
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      let query = {};
      if (filter) {
        query.role = filter;
      }

      if (search) {
        query.email = { $regex: new RegExp(search, "i") };
      }
      const result = await userCollection
        .find(query)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.get("/users/admin/:email", verifyMiddleware, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });
    app.get("/users/guid/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let TourGuide = false;
      if (user) {
        TourGuide = user?.role === "TourGuide";
      }
      res.send({ TourGuide });
    });

    app.get("/findusers/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch(
      "/users/admin/:id",
      verifyMiddleware,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: "admin",
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    app.patch("/users/guide/:id",  async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "TourGuide",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/users/profile/:email", async (req, res) => {
      const userEmail = req.params.email;
      const query = { email: userEmail };
      const updatedData = req.body;
      const updatedDoc = {
        $set: {
          phone: updatedData.phone,
          address: updatedData.address,
          city: updatedData.city,
          age: updatedData.age,
          skills: updatedData.skills,
          workExperience: updatedData.workExperience,
          education: updatedData.education,
          gender: updatedData.gender,
          aboutUser: updatedData.aboutUser,
        },
      };
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);
    });

    app.get("/findGuide", async (req, res) => {
      const GuidUser = await userCollection
        .find({ role: "TourGuide" })
        .toArray();
      res.send(GuidUser);
    });

    app.get("/guidProfile/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.get("/userCount", async (req, res) => {
      const count = await userCollection.estimatedDocumentCount();
      res.send({ count });
    });

    // Packeges Related Route

    app.post("/addpackage", async (req, res) => {
      const packeageData = req.body;
      const result = await packegCollection.insertOne(packeageData);
      res.send(result);
    });

    app.get("/packege", async (req, res) => {
      const result = await packegCollection.find().toArray();
      res.send(result);
    });

    app.get("/packageDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await packegCollection.findOne(query);
      res.send(result);
    });

    // Booking Route

    app.post("/booking", async (req, res) => {
      const bookingData = req.body;
      const result = await bookingCollection.insertOne(bookingData);
      res.send(result);
    });

    app.get("/getbooking", async (req, res) => {
      const { email } = req.query;
      const query = { email: email };
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await bookingCollection.find(query).skip(page * size)
      .limit(size).toArray();
      res.send(result);
    });

    app.delete("/deletebooking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/myBooking", async (req, res) => {
      const { name } = req.query;
      const query = { tourGuide: name };
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await bookingCollection
        .find(query)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.patch("/acceptedbooking/status/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "Accepted",
        },
      };
      const result = await bookingCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/booking/status/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "Rejected",
        },
      };
      const result = await bookingCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.get("/myTotalBooking", async (req, res) => {
      const count = await bookingCollection.estimatedDocumentCount();
      res.send({ count });
    });

    // WishList

    app.post("/addwishlist", async (req, res) => {
      const wishlistData = req.body;
      const result = await wishlistCollection.insertOne(wishlistData);
      res.send(result);
    });

    app.get("/wishlist", async (req, res) => {
      const { email } = req.query;
      const query = { userEmail: email };
      const page = parseInt(req.query.page);
      console.log(page)
      const size = parseInt(req.query.size);
      console.log(size)
      const result = await wishlistCollection
        .find(query)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send(result);
    });

    app.delete("/deletewishlist/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/wishlistCount", async (req, res) => {
      const count = await wishlistCollection.estimatedDocumentCount();
      res.send({ count });
    });

    // Add Story
    app.post("/addstory", async (req, res) => {
      const storyData = req.body;
      const result = await storyCollection.insertOne(storyData);
      res.send(result);
    });

    app.get("/getStorys", async (req, res) => {
      const result = await storyCollection.find().toArray();
      res.send(result);
    });

    app.get("/findStory/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await storyCollection.findOne(query);
      res.send(result);
    });

    // Tour Type
    app.get("/tourtype", async (req, res) => {
      const result = await tourTypeCollection.find().toArray();
      res.send(result);
    });

    app.get("/tourCategory/:tourType", async (req, res) => {
      const type = req.params.tourType;
      const query = { tourType: type };
      const result = await packegCollection.find(query).toArray();
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log("Server is Running Now");
});
