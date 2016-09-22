'use strict';

let expect = require('chai').expect;
let ArdiSearcher = require('../lib/searcher');

describe('Searcher module tests', function () {
  describe('#search - One word query, multple fields', function () {
    it('should match all the 5 documents and return in correct relavancy', function () {
      let docs = require('./fixtures/data/multiple_fields_one_word_query_no_popularity');
      let expectedResults = require('./fixtures/expected/multiple_fields_one_word_query_no_popularity_expected');
      let searcher = new ArdiSearcher({
        docs: docs,
        multi_match: {
          query: 'TitleSynopsisRelevancyTestTopGear20160922095123',
          fields: {
            ep_parent_title: {
              boost: 10,
            },
            ep_parent_parent_title: {
              boost: 10,
            },
            top_level_title: {
              boost: 200,
            },
            ev_synopsis: {
              boost: 5,
            },
            ep_synopsis: {
              boost: 5,
            },
            ep_title: {
              boost: 5,
            },
          },
        },
      });

      let results = searcher.search();
      expect(results).to.deep.equal(expectedResults);
    });
  });

  describe('#search - Multiple word query, multple fields', function () {
    it('should search correctly and return top 10 most relevant results', function () {
      let docs = require('./fixtures/data/main_mock_search_docs');
      let expectedResults = require('./fixtures/expected/multiple_fields_multiple_word_query_no_popularity_expected');
      let searcher = new ArdiSearcher({
        docs: docs,
        multi_match: {
          query: 'PHP test',
          fields: {
            title: {
              boost: 10,
            },
            tags: {
              boost: 5,
            },
          },
        },
      });

      let results = searcher.search();
      expect(results).to.deep.equal(expectedResults);
    });
  });
});

