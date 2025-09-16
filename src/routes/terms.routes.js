
const express = require('express');
const { createTerms, getTerms, updateTerms } = require('../controller/terms.controller');


const router = express.Router();

router.post("/", createTerms); // create new terms
router.get("/", getTerms); // get latest terms
router.put("/:id", updateTerms); // update terms by id

module.exports = router;
