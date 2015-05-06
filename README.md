# ts-tinkerpop

A helper library for [Typescript](http://www.typescriptlang.org/) applications using
[TinkerPop 3](http://www.tinkerpop.com/) via [node-java](https://github.com/joeferner/node-java),
with a `java.d.ts` interface generated by [ts-java](https://github.com/RedSeal-co/ts-java).

## Usage

Import the `ts-tinkerpop` module, giving it a short name of your choice. Do this everywhere
you want to use functions from the `ts-tinkerpop` module.

```
import TP = require('ts-tinkerpop');
```

## Node-java Initialization

`ts-tinkerpop` takes advantage of a feature in `node-java` for coordinating application initialization and JVM creation. `ts-tinkerpop` registers itself on first import using the [java.registerClient](https://github.com/joeferner/node-java#javaRegisterClient) function. An application using `ts-tinkerpop` must therefore create the JVM using the corresponding [java.ensureJvm](https://github.com/joeferner/node-java#javaEnsureJvm) function. However, `ts-tinkerpop` wraps the `java.ensureJvm()` function in the method `TP.getTinkerpop()`:

```
import TP = require('ts-tinkerpop');

TP.getTinkerpop().then(() => {
	// ts-tinkerpop and JVM ready to use here.
});
```

`ts-tinkerpop` uses [Bluebird](https://github.com/petkaantonov/bluebird) promises, and configures node-java for just sync functions, with no suffix, and promises, with the suffix 'P':

```
java.asyncOptions = {
  syncSuffix: '',
  promiseSuffix: 'P',
  promisify: BluePromise.promisify
};
```

## ts-tinkerpop helper functions

All of the `ts-tinkerpop` helper functions are in the one source file `lib/ts-tinkerpop.ts`. See the [groc](https://github.com/nevir/groc) generated documentation in `doc/lib/ts-tinkerpop.html`. See also the unit tests for examples: `test/tinkerpop-test.ts`.

## Coverage of the Tinkerpop Java API

In addition to the helper functions, `ts-tinkerpop` exposes much of the Tinkerpop 3 Java API.

`ts-tinkerpop` is currently up to date with the latest release `3.0.0.M8-incubating`. Our intent is to track Tinkerpop releases closely.

`ts-tinkerpop` currently exposes a significant subset of the Tinkerpop 3 `gremlin-core`, `gremlin-groovy` and `tinkergraph-gremlin` packages. The set of classes exposed largely aligns with the classes automatically imported by the Gremlin Groovy Console, with the notable exception that `ts-tinkerpop` currently does not expose any classes from the `gremlin-driver` package.

See the `tsjava` section of `package.json` to see which packages and classes are included in the configuration, or for the full details, run the tsjava tool as follows:

```
$ ./node_modules/.bin/ts-java --details
ts-java version 1.0.8
Generated classes:
   co.redseal.gremlinnode.function.AbstractGlobFunction
   co.redseal.gremlinnode.function.AndThenGlobFunction
   co.redseal.gremlinnode.function.GlobFunction
   co.redseal.gremlinnode.function.GroovyLambda
   co.redseal.gremlinnode.function.IdentityGlobFunction
   co.redseal.gremlinnode.function.NegateGlobFunction
   co.redseal.gremlinnode.testing.TestClass
   groovy.lang.Binding
   groovy.lang.Closure
   groovy.lang.DelegatingMetaClass
   groovy.lang.GroovyClassLoader
   groovy.lang.GroovyCodeSource
   groovy.lang.GroovyObjectSupport
   groovy.lang.GroovyResourceLoader
   ...
```
