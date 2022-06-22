const express = require("express");
const router = require("express").Router();
const Product = require("./../model/product");

router.post("/save", async (req, res) => {
  const productExists = await Product.findOne({
    modelNo: req.body.modelNo,
  }).catch((err) => console.error(err));
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
      .catch((error) => res.status(500).json({
        msg: error
      }));
  }
});

router.delete("/delete", async (req, res) => {
  const productExists = await Product.findOneAndDelete({
    email: req.query.email,
  }).catch((err) => console.error(err));

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
  if (req.query.serialNumber) {
    const modelNo = req.query.serialNumber.charAt(4);
    Product.findOne({
      modelNo: modelNo
    }).then((data) => {
      if (data) {
        res.json({
          status: "success",
          result: {
            name: data.name,
            image: "/images/" + data.image,
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
    }).catch(
      (err) =>{
         console.error(err)
         res.json({
           status: "failure",
           result: null,
           message: "No Device found",
         });
      }
    );
  }
});


module.exports = router;