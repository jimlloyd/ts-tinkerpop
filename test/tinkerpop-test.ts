// # tinkerpop-test.ts
/// <reference path='../typings/bluebird/bluebird.d.ts' />
/// <reference path='../typings/chai/chai.d.ts'/>
/// <reference path='../typings/debug/debug.d.ts' />
/// <reference path='../typings/glob/glob.d.ts' />
/// <reference path='../typings/java/java.d.ts' />
/// <reference path='../typings/lodash/lodash.d.ts' />
/// <reference path='../typings/mocha/mocha.d.ts'/>
/// <reference path='../typings/node/node.d.ts'/>
/// <reference path='../typings/should/should.d.ts'/>

'use strict';

declare function require(name: string): any;
require('source-map-support').install();

import _ = require('lodash');
import BluePromise = require('bluebird');
import chai = require('chai');
import debug = require('debug');
import should = require('should');
import glob = require('glob');
import java = require('java');
import T = require('../index');
import util = require('util');

var dlog = debug('ts-tinkerpop:test');

before((done: MochaDone): void => {
  java.asyncOptions = {
    promiseSuffix: 'Promise',
    promisify: require('bluebird').promisify
  };

  var filenames = glob.sync('target/**/*.jar');
  filenames.forEach((name: string): void => { dlog(name); java.classpath.push(name); });

  T.initialize();
  done();
});

describe('Gremlin', (): void => {

  var async = require('async');
  var expect = chai.expect;
  var semaphore = require('semaphore');
  var stringify = require('json-stable-stringify');
  var temp = require('temp');
  // Cleanup temp files at exit.
  temp.track();

  var graph: Java.TinkerGraph;

  before((done: MochaDone): void => {
    expect(T.TinkerGraph).to.be.ok;
    done();
  });

  // ## TinkerGraph in-memory
  // Tests using an empty in-memory TinkerGraph database instance.
  describe('TinkerGraph empty', (): void => {

    before((): void => {
      graph = T.TinkerGraph.openSync();
      expect(graph).to.be.ok;
    });

    after((done: MochaDone): void => {
      if (graph) {
        graph.close((): void => {
          graph = null;
          done();
        });
      } else {
          done();
      }
    });

    it('should initialize', (): void => {
      // intentionally blank
    });

    // Check that the Gremlin statements `graph.V.count()` and `graph.E.count()` return `0`.
    it('should be empty', (done: MochaDone): void => {
      // Count vertices.
      var allVerticesTraversal = graph.VSync(T.noargs);

      // The "count" method applies to a Traversal, destructively measuring the number of
      // elements in it.
      allVerticesTraversal.countSync().next((err: Error, count: Java.Object): void => {
        expect(err).to.not.exist;
        expect(count.valueOf()).to.equal(0);

        // Count edges.
        var allEdgesTraversal = graph.ESync(T.noargs);

        allEdgesTraversal.countSync().next((err: Error, count: Java.Object): void => {
          expect(err).to.not.exist;
          expect(count.valueOf()).to.equal(0);
          done();
        });
      });
    });

  });

  // ## TinkerGraph built-in example
  // Tests using the graph referenced in Gremlin documentation examples like
  // https://github.com/tinkerpop/gremlin/wiki/Basic-Graph-Traversals
  describe('TinkerGraph built-in example', (): void => {

    var graph: Java.TinkerGraph;

    before((): void => {
      expect(T.TinkerFactory).to.be.ok;
      graph = T.TinkerFactory.createClassicSync();
      expect(graph).to.be.ok;
    });

    after((done: MochaDone): void => {
      if (graph) {
        graph.close((): void => {
          graph = null;
          done();
        });
      } else {
        done();
      }
    });

    it('should initialize', (): void => {
      // intentionally blank
    });

    // To extract the unique values of the "name" property from all vertices, the canonical
    // Gremlin would be `graph.V.value('name').dedup`.  However, it can also be written with
    // the shortcut syntax for property access: `graph.V.name.dedup`.
    it('has certain names', (): BluePromise<void> => {
      var distinctNamesTraversal: Java.GraphTraversal = graph.VSync(T.noargs).valuesSync(T.S(['name'])).dedupSync();
      expect(distinctNamesTraversal).to.be.ok;
      return distinctNamesTraversal
        .toListPromise()
        .then((list: Java.List) => list.toArrayPromise())
        .then((data: Java.object_t[] ) => {
          var expected = ['lop', 'vadas', 'marko', 'peter', 'ripple', 'josh'];
          // Sort data to ignore sequence differences.
          expected.sort();
          data.sort();
          expect(data).to.deep.equal(expected);
        });
      });

    it('g.V().has("name", "marko") -> v.value("name")', (): BluePromise<void> => {
      return graph.VSync(T.noargs).hasSync('name', 'marko')
        .nextPromise()
        .then((v: Java.Vertex) => {
          expect(v).to.be.ok;
          var name: Java.object_t = v.valueSync('name');
          expect(name).to.be.equal('marko');
        });
    });

    it('g.V().valueSync("name")', (): BluePromise<void> => {
      return graph.VSync(T.noargs).valuesSync(T.S(['name'])).toListPromise()
        .then((list: Java.List) => list.toArrayPromise())
        .then((data: Java.object_t[] ) => {
          expect(data).to.be.ok;
          var expected = [ 'marko', 'vadas', 'lop', 'josh', 'ripple', 'peter' ];
          expect(data).to.deep.equal(expected);
        });
    });

    it('filter() with JavaScript lambda', (): BluePromise<void> => {
      var js = 'a.get().value("name") == "lop"';
      var lambda = T.newJavaScriptLambda(js);
      return graph.VSync(T.noargs).filterSync(lambda).toListPromise()
        .then((list: Java.List) => list.toArrayPromise())
        .then((recs: Java.object_t[] ) => {
          expect(recs).to.be.ok;
          expect(recs.length).to.equal(1);
          var v: Java.Vertex = T.asVertex(recs[0]);
          var vertexObj: any = T.vertexToJson(v);
          var expected = {
            id: 3,
            label: 'vertex',
            type: 'vertex',
            properties: {
              name: [ { id: 4, value: 'lop', properties: {} } ],
              lang: [ { id: 5, value: 'java', properties: {} } ]
            }
          };
          expect(vertexObj).to.deep.equal(expected);
        });
    });

    it('choose(Function).option with integer choice, groovy fragment', (): BluePromise<void> => {
      var __ = T.__;

      // Use the result of the function as a key to the map of traversal choices.
      var groovy = 'a.value("name").length()';
      var lambda = T.newGroovyLambda(groovy);

      var chosen = graph.VSync(T.noargs).hasSync('age').chooseSync(lambda)
          .optionSync(5, __.inSync(T.noargs))
          .optionSync(4, __.outSync(T.noargs))
          .optionSync(3, __.bothSync(T.noargs))
          .valuesSync(T.S(['name']));

      return chosen.toListPromise()
        .then((list: Java.List) => list.toArrayPromise())
        .then((actual: Java.object_t[] ) => {
          var expected = ['marko', 'ripple', 'lop'];
          expect(actual.sort()).to.deep.equal(expected.sort());
        });
    });

    it('choose(Function).option with integer choice, groovy closure', (): BluePromise<void> => {
      var __ = T.__;

      // Use the result of the function as a key to the map of traversal choices.
      var groovy = '{ vertex -> vertex.value("name").length() }';
      var lambda = T.newGroovyClosure(groovy);

      var chosen = graph.VSync(T.noargs).hasSync('age').chooseSync(lambda)
          .optionSync(5, __.inSync(T.noargs))
          .optionSync(4, __.outSync(T.noargs))
          .optionSync(3, __.bothSync(T.noargs))
          .valuesSync(T.S(['name']));

      return chosen.toListPromise()
        .then((list: Java.List) => list.toArrayPromise())
        .then((actual: Java.object_t[] ) => {
          var expected = ['marko', 'ripple', 'lop'];
          expect(actual.sort()).to.deep.equal(expected.sort());
        });
    });

    it('T.forEach(g.V())', (): BluePromise<void> => {
      var traversal = graph.VSync(T.noargs);
      return T.forEach(traversal, (obj: Java.Object): BluePromise<void> => {
        var v: Java.Vertex = T.asVertex(obj);
        var json: any = T.vertexToJson(v);
        expect(json).to.include.keys(['id', 'label', 'type', 'properties']);
        expect(json.type).to.equal('vertex');
        return BluePromise.resolve();
      });
    });

    it('T.forEach(g.E())', (): BluePromise<void> => {
      var traversal = graph.ESync(T.noargs);
      return T.forEach(traversal, (obj: Java.Object): BluePromise<void> => {
        var e: Java.Edge = T.asEdge(obj);
        var json: any = T.edgeToJson(e);
        expect(json).to.include.keys(['id', 'label', 'type', 'properties', 'inV', 'outV', 'inVLabel', 'outVLabel']);
        expect(json.type).to.equal('edge');
        return BluePromise.resolve();
      });
    });

  });

});
