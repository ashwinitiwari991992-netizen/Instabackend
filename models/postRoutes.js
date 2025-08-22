// routes/postRoutes.js
const express = require("express");
const Post = require("../models/postModel");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

const router = express.Router();

// ✅ Middleware to check if user is logged in
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; // attach userId to request
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// ✅ Create new post
router.post("/create", authMiddleware, async (req, res) => {
  try {
    const { caption, image } = req.body;

    if (!image) {
      return res.status(400).json({ message: "Image is required" });
    }

    const newPost = new Post({
      user: req.userId,
      caption,
      image,
    });

    await newPost.save();
    res.status(201).json({ message: "Post created", post: newPost });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Get all posts (feed)
router.get("/feed", authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("user", "username profilePicture")
      .populate("comments.user", "username profilePicture")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Like a post
router.post("/:id/like", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.likes.includes(req.userId)) {
      // already liked → unlike
      post.likes = post.likes.filter((id) => id.toString() !== req.userId);
    } else {
      // like the post
      post.likes.push(req.userId);
    }

    await post.save();
    res.json({ message: "Post updated", likes: post.likes.length });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ✅ Comment on a post
router.post("/:id/comment", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "Comment cannot be empty" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = {
      user: req.userId,
      text,
      createdAt: new Date(),
    };

    post.comments.push(comment);
    await post.save();

    res.json({ message: "Comment added", comments: post.comments });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
