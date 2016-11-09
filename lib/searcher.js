'use strict';

;(function (root, factory) {
  root.ArdiSearcher = factory();
  if (exports) {
    module.exports = factory();
  }
})(this, function () {

  class ArdiSearchDocScorer {
    constructor(options) {
      this.docs = options.docs;
      this.docsCount = this.docs.length;
      this.scoreType = ArdiSearchDocScorer.defaults.scoreType;
      this.fields = options.fields;
      if (options.popularity) this.popularity = options.popularity;
      if (options.query) this.setQuery(options.query);
    }

    static get defaults() {
      return {
        scoreType: 'average',
      };
    }

    score(doc) {
      this._currentDoc(doc);
      doc._score = this.doCalcScore();
    }

    doCalcScore() {
      let result;
      let fieldPositiveScores = [0];
      let fields = this.fields;

      for (let fieldName in fields) {
        if (fields.hasOwnProperty(fieldName)) {
          let currentField = fields[fieldName];
          let fieldScore = this.calcFieldScore(currentField, fieldName);

          if (fieldScore > 0) {
            fieldPositiveScores.push(fieldScore);
          }
        }
      }

      // Use the best-field (uses the score of the single best matching field)
      result = Math.max.apply(null, fieldPositiveScores);

      // Take into account popularity (multiply)
      if (this.popularity && this.popularity.field) {
        result *= this._doc[this.popularity.field];
      }

      return result;
    }

    calcFieldScore(value, name) {
      let result = 0;
      let doc = this._doc;
      let fieldBoost = value.boost || 1;
      let coordRatio = this.coord(doc, name);

      if (coordRatio > 0) {
        result = coordRatio * this.sumTermScores(doc, name, fieldBoost);
      }

      return result;
    }

    setQuery(query) {
      this.query = query || '';
      this.queryTerms = this.query.split(' ');
    }

    sumTermScores(doc, fieldName, fieldBoost) {
      let scoreSum = 0;

      this.queryTerms.forEach(function (term) {
          scoreSum += this.termFreq(doc, term, fieldName) *
                      this.inverseDocFreq(term, fieldName) *
                      this.fieldTermNorm(doc, fieldName) *
                      fieldBoost;
        }, this);

      return scoreSum;
    }

    /**
     * Returns the ratio/percentage of query terms in the document field
     * @param  {[type]} doc       [description]
     * @param  {[type]} fieldName [description]
     * @return {[type]}           [description]
     */
    coord(doc, fieldName) {
      let count = 0;
      this.queryTerms.forEach(function (word) {
        if (Array.isArray(doc[fieldName]) && doc[fieldName].indexOf(word) > -1) {
          count++;
        }

        if (typeof doc[fieldName] === 'string' &&
              doc[fieldName].toLowerCase().indexOf(word.toLowerCase()) > -1) {
          count++;
        }
      }, this);

      return count / this.queryTerms.length;
    }

    docsMatchingTerm(term, fieldName) {
      return this.docs.filter(function (doc) {
        if (Array.isArray(doc[fieldName])) {
          return doc[fieldName].indexOf(term) > -1;
        }

        return doc[fieldName].toLowerCase().indexOf(term.toLowerCase()) > -1;
      }, this).length;
    }

    inverseDocFreq(term, fieldName) {
      return 1 + Math.log(this.docsCount / (this.docsMatchingTerm(term, fieldName) + 1));
    }

    fieldTermNorm(doc, fieldName) {
      let fieldTermCount = Array.isArray(doc[fieldName])
                      ? doc[fieldName].length
                      : doc[fieldName].split(' ').length;

      return 1 / Math.sqrt(fieldTermCount);
    }

    termFreq(doc, term, fieldName) {
      let pattern = new RegExp(term, 'gi');
      let frequency = (function (term, fieldValue) {
        let matchesCount = 0;
        if (Array.isArray(fieldValue)) {
          fieldValue.forEach(function (itemVal) {
            matchesCount += (itemVal.match(pattern) || []).length;
          });
        } else {
          matchesCount = (fieldValue.match(pattern) || []).length;
        }

        return matchesCount;
      })(term, doc[fieldName]);

      return Math.sqrt(frequency);
    }

    _currentDoc(doc) {
      this._doc = doc;
    }
  }

  class ArdiSearcher {
    constructor(options) {
      this.docs = options.docs;
      this.query = options.multi_match.query;
      this.scorer = options.resultScorer || new ArdiSearchDocScorer({
        docs: this.docs,
        query: this.query,
        fields: options.multi_match.fields,
        popularity: options.popularity,
      });
    }

    search(query, maxResults) {
      let results = [];
      maxResults = maxResults || 10;
      this.query = query || this.query;
      if (!this.query) {
        throw new Error('Can not perform search without query!');
      }

      this.scorer.setQuery(this.query);
      this.docs.forEach(this.scorer.score.bind(this.scorer));

      this.docs.sort(function (a, b) {
        return b._score - a._score;
      });

      for (let i = 0; i < Math.min(maxResults, this.docs.length); i++) {
        if (this.docs[i]._score === 0) {
          break;
        }

        results.push(this.docs[i]);
      }

      return results;
    }
  }

  return ArdiSearcher;
});
