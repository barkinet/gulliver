/**
 * Copyright 2015-2016, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const express = require('express');
const router = express.Router(); // eslint-disable-line new-cap
const asset = require('../lib/asset-hashing').asset;

const ASSETS = JSON.stringify([
  '/css/style.css',
  '/js/gulliver.js'
].map(assetPath => asset.encode(assetPath)));

const ASSETS_JS = `const ASSETS = ${ASSETS};`;

router.get('/sw-assets-precache.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-cache, max-age=0');
  res.send(ASSETS_JS);
});

module.exports = router;
