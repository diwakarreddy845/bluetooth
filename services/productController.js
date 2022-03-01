const express = require("express");
const router = require("express").Router();
const Product = require("./../model/product");

router.post("/save", async (req, res) => {
  const productExists = await Product.findOne({ modelNo: req.body.modelNo });
  if (productExists) {
    return res.json({
      status: "failure",
      result: "",
      message: "Product Model is alredy exists",
    });
  } else {
    Product.create(req.body)
      .then((result) =>
        res.status(200).json({
          status: "success",
          result: result,
          message: "You've successfully created Product",
        })
      )
      .catch((error) => res.status(500).json({ msg: error }));
  }
});

router.delete("/delete", async (req, res) => {
  const productExists = await Product.findOneAndDelete({
    email: req.query.email,
  });

  if (productExists) {
    return res.json({
      status: "success",
      result: productExists,
      message: "You've successfully removed  your product",
    });
  } else {
    return res.json({
      status: "failure",
      result: null,
      message: "No product found",
    });
  }
});

router.get("/getProduct", async (req, res) => {
  const modelNo = req.query.serialNumber.charAt(4);
  const productExists = await Product.findOne({ modelNo: modelNo });
  if (productExists) {
    res.json({
      status: "success",
      result: {
        name: productExists.name,
        image: "/images/" + productExists.image,
      },
      message: "Device found",
    });
  } else {
    res.json({
      status: "failure",
      result: null,
      message: "No Device found",
    });
  }
});

module.exports = router;
