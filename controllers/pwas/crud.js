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
const pwaLib = require('../../lib/pwa');
const Pwa = require('../../models/pwa');
const router = express.Router(); // eslint-disable-line new-cap
const config = require('../../config/config');
const CLIENT_ID = config.get('CLIENT_ID');
const CLIENT_SECRET = config.get('CLIENT_SECRET');
const LIST_PAGE_SIZE = 10;

/**
 * GET /pwas/add
 *
 * Display a page of PWAs (up to ten at a time).
 */
router.get('/', (req, res, next) => {
  function callback(err, entities, cursor) {
    if (err) {
      return next(err);
    }

    res.render('pwas/list.hbs', {
      pwas: entities,
      nextPageToken: cursor
    });
  }
  pwaLib.list(LIST_PAGE_SIZE, req.query.pageToken, callback);
});

/**
 * GET /pwas/add
 *
 * Display a form for creating a PWA.
 */
router.get('/add', (req, res) => {
  res.render('pwas/form.hbs', {
    pwa: {},
    action: 'Add'
  });
});

/**
 * POST /pwas/add
 *
 * Create a PWA.
 */
router.post('/add', (req, res, next) => {
  const manifestUrl = req.body.manifestUrl;
  const idToken = req.body.idToken;
  var pwa = new Pwa(manifestUrl);

  if (!manifestUrl) {
    res.render('pwas/form.hbs', {
      pwa,
      error: 'no manifest provided'
    });
    return;
  }

  if (!idToken) {
    res.render('pwas/form.hbs', {
      pwa,
      error: 'user not logged in'
    });
    return;
  }

  verifyIdToken(CLIENT_ID, CLIENT_SECRET, idToken)
    .then(user => {
      pwa.setUserId(user);
      const callback = (err, savedData) => {
        if (err) {
          if (typeof err === 'number') {
            switch (err) {
              case pwaLib.E_ALREADY_EXISTS:
                res.render('pwas/form.hbs', {
                  pwa,
                  error: 'manifest already exists'
                });
                return;
              case pwaLib.E_MANIFEST_ERROR:
                res.render('pwas/form.hbs', {
                  pwa,
                  error: 'error loading manifest' // could be 404, not JSON, domain does not exist
                });
                return;
              default:
                return next(err);
            }
          }
        }
        res.redirect(req.baseUrl + '/' + savedData.id);
      };
      pwaLib.save(pwa, callback);
    })
    .catch(err => {
      res.render('pwas/form.hbs', {
        pwa,
        error: err
      });
      console.log(err);
      return;
    });
});

/**
 * GET /pwas/:id/edit
 *
 * Display a pwa for editing.
 */
router.get('/:pwa/edit', (req, res, next) => {
  pwaLib.find(req.params.pwa, (err, entity) => {
    if (err) {
      return next(err);
    }

    res.render('pwas/form.hbs', {
      pwa: entity,
      action: 'Edit'
    });
  });
});

/**
 * POST /pwas/:id/edit
 *
 * Update a PWA.
 */
router.post('/:pwa/edit', (req, res, next) => {
  const manifestUrl = req.body.manifestUrl;
  const idToken = req.body.idToken;
  const data = req.body;
  data.id = req.params.pwa;

  var pwa = new Pwa(manifestUrl);
  pwa.id = data.id;

  if (!manifestUrl) {
    res.render('pwas/form.hbs', {
      pwa,
      error: 'no manifest provided'
    });
    return;
  }

  if (!idToken) {
    res.render('pwas/form.hbs', {
      pwa,
      error: 'user not logged in'
    });
    return;
  }

  verifyIdToken(CLIENT_ID, CLIENT_SECRET, idToken)
    .then(user => {
      pwa.setUserId(user);
      const callback = (err, savedData) => {
        if (err) {
          if (typeof err === 'number') {
            switch (err) {
              case pwaLib.E_MANIFEST_ERROR:
                res.render('pwas/form.hbs', {
                  pwa,
                  error: 'error loading manifest' // could be 404, not JSON, domain does not exist
                });
                return;
              default:
                return next(err);
            }
          }
        }
        res.redirect(req.baseUrl + '/' + savedData.id);
      };
      pwaLib.save(pwa, callback);
    })
    .catch(err => {
      res.render('pwas/form.hbs', {
        pwa,
        error: err
      });
      console.log(err);
      return;
    });
});

/**
 * GET /pwas/:id
 *
 * Display a PWA.
 */
router.get('/:pwa', (req, res, next) => {
  pwaLib.find(req.params.pwa, (err, entity) => {
    if (err) {
      // Not really an error: the pwa wasn't found in the db. Fall through to 404 page.
      return next();
    }

    res.render('pwas/view.hbs', {
      pwa: entity
    });
  });
});

/**
 * GET /pwas/:id/delete
 *
 * Delete a PWA.
 */
router.get('/:pwa/delete', (req, res, next) => {
  pwaLib.delete(req.params.pwa, err => {
    if (err) {
      return next(err);
    }
    res.redirect(req.baseUrl);
  });
});

/**
 * Errors on "/pwas/*" routes.
 */
router.use((err, req, res, next) => {
  // Format error and forward to generic error handler for logging and
  // responding to the request
  err.response = err.message;
  next(err);
});

/**
 * @param {string} clientId
 * @param {string} clientSecret
 * @param {string} idToken
 * @return {Promise<GoogleLogin>}
 */
function verifyIdToken(clientId, clientSecret, idToken) {
  const authFactory = new (require('google-auth-library'))();
  const client = new authFactory.OAuth2(clientId, clientSecret);
  return new Promise((resolve, reject) => {
    client.verifyIdToken(idToken, clientId, (err, user) => {
      if (err) {
        reject(err);
      }
      resolve(user);
    });
  });
}

module.exports = router;
