# Flow field

The core technique is taken from a deleted StackOverflow post here: https://gamedev.stackexchange.com/posts/153011/revisions

Note: None of these have been heavily optimized as this is just a quick JavaScript reference. It is presented with the idea that one can feed this into an AI model which will merge it into whatever ECS you happen to be using.

`flow-field-lab-1.html` was the above information turned into a plan and implemented by Opus 5.5 one-shot.

`flow-field-lab-2.html` has single radius entities with CPU and GPU simulation.

`flow-field-lab-3.html` has multi-radius entities with CPU and GPU simulation.

`flow-field-lab-4.html` has a vibe-coded determinism that might work, but it hasn't been tested at all. (Opus 5.5 and Astra can both bring this to production quality determinism, but I'm not doing that for a JS demo).

`flow-field-lab-5.html` has my AVBD 2D physics port merged into it allowing any convex entity shape. Has web worker scaling. No GPU compute version. For 100K entities an example of performance:

```
Threads    ms per 1/60 s    Speed-up    Physics    Solve    Contacts    Coordination    Steering    Congestion    Grid    Sort, setup
1    521.1    1.00×    498.8    251.2    144.6    65.7    23.0    10.2    9.0    3.2
2    292.2    1.78×    271.2    134.1    80.2    32.9    12.2    7.0    11.4    2.4
4    157.1    3.32×    142.2    70.1    41.1    16.7    6.4    4.3    8.9    1.6
8    98.8    5.27×    85.7    42.0    24.3    9.4    3.8    3.4    8.1    1.6
12    85.9    6.07×    73.5    37.0    20.2    7.5    3.1    3.2    7.8    1.2
16    80.1    6.51×    67.7    34.8    17.7    6.7    2.8    3.5    8.0    0.8
20    76.3    6.83×    63.5    34.5    14.7    5.9    2.7    3.6    8.0    1.2

Fastest: 20 threads, 76.3 ms per 1/60 s, which is 0.22× real time. The physics, congestion and the grid rebuild run on all threads; the re-sort, building the colour lists and the warm-start table, and respawns still run on one. Peer B kept checking throughout.
```

As mentioned this isn't optimized, so this table gives you general idea of what costs a lot in the current implementation.

This one implements various options on the right for how groups interact. They're just examples and you can get much more involved with steering behavior in these kinds of systems. Sometimes with enemy groups you want them to block one another for example rather than flowing past one another. This can drastically change the gameplay feel, so be aware of that.

# Running locally

If you run the above locally just in a browser it will be locked to the main thread with no web workers.

Install node.js and then run the following. Change the `serve_isolated.js` script to point at the right HTML file:

`node serve_isolated.js`

# Known Issues

Units in lab-5 have extremely naive sleep code. Since there's no formations or anything more complex when the units get to their destination they just clump together bumping into each other waking one another up. Can be fixed, but I'm not going to add a bunch of code to hardcode a solution that might not match what a specific game would use.

In the lab-5 the squares are naively setup to look toward their heading because it looked nice. In a rapidly changing flow field this can cause them to rotate a lot which can look odd.

I haven't tested it, but the way this is implemented it is **limited to 256 flow fields**. So sending small quantities of units or single units across a map with this is not ideal. For many small games it would be fine though.

Further reading when you want to pathfind single units:

Regarding Goal Bounding and Jump Point Search, Hu (2021)

Also just saw this which looked interesting: Faster Grid Pathfinding with Approximate Bounding Boxes, Carlson (2026)

Two-Oracle Optimal Path Planning on Grid Maps, Salvetti (2018)

There are also various hierarchical pathfinding systems. Note that many of these have trade-offs on static/dynamic worlds. So if you are continuously adding/removing barriers you might run into edge-cases.