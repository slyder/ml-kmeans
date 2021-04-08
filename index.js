class KMeans {

  constructor(opts) {
    // Number of cluster centroids.
    this.k = opts.k;

    console.log('opts', opts)
    this.canvas = opts.canvas;
    this.context = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    // Clear the canvas.
    this.context.fillStyle = 'rgb(220,220,220)';
    this.context.fillRect(0, 0, this.width, this.height);

    this.clusterColors = this.generateClusterColors();
    console.log('clusterColors', this.clusterColors)

    // Points to cluster.
    this.data = opts.data;
    console.log('data', this.data)

    this.dimensionStats = this.getDimensionStats(this.data);
    console.log('dimensionStats', this.dimensionStats)

    this.means = this.getRandomSeeds(this.dimensionStats)
    console.log('this.means', this.means)

    this.assignments = [];

    this.draw();

    this.iterations = 0;
    this.run();
  }

  getDimensionStats(data) {
    return data[0].map((_, i) => {
      const values = data.map(d => d[i]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      return {
        min,
        max,
        range: max - min,
      }
    })
  }

  getRandomSeeds(dimensionStats) {
    const means = []
    for (let i = 0; i < this.k; i++) {
      means.push(
        dimensionStats.map((stat) => (
          stat.min + stat.range * Math.random()
        ))
      )
    }
    return means
  }

  generateClusterColors() {
    return ['red', 'blue', 'green', 'orange', 'yellow', 'magenta', '#844eff']

    const colors = [];
    for (let i = 0; i < this.k; i++) {
      colors.push('#'+((Math.random()*(1<<24))|0).toString(16));
    }
    return colors;
  }

  draw() {
    this.context.fillStyle = 'rgba(220,220,220, 0.33)';
    this.context.fillRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.assignments.length; i++) {
      // console.count('todo:')
    }

    // Plot every point onto canvas.
    for (let i = 0; i < this.data.length; i++) {
      this.plotPoint(
        this.data[i],
        this.clusterColors[this.assignments[i]] || 'black',
        1,
        false,
      )
    }

    // Draw cluster centroids (means).
    for (let i = 0; i < this.means.length; i++) {
      this.plotPoint(this.means[i], this.clusterColors[i], 0.5, true);
    }
  }

  plotPoint(point, color, alpha, fill = false) {
    if (!color) return
    this.context.save();

    this.context.globalAlpha = alpha;

    this.context.translate(
      (point[0] - this.dimensionStats[0].min + 1) * (this.width / (this.dimensionStats[0].range + 2)),
      (point[1] - this.dimensionStats[1].min + 1) * (this.width / (this.dimensionStats[1].range + 2)),
    );
    this.context.beginPath();
    this.context.arc(0, 0, 4, 0, Math.PI*2, true);
    if (fill) {
      this.context.fillStyle = color;
      this.context.fill();
    }
    else {
      this.context.strokeStyle = color;
      this.context.stroke();
    }
    this.context.closePath();

    this.context.restore();
  }

  moveMeans() {
    let moved = false;

    this.means = this.means.map((mean, meanIndex) => {
      const averages = new Array(mean.length);
      let count = 0;

      this.assignments.forEach((value, index) => {
        if (value !== meanIndex) return;

        for (let dim = 0; dim < mean.length; dim++) {
          if (!averages[dim]) averages[dim] = 0;
          averages[dim] += this.data[index][dim];
        }

        count++;
      })

      for (let dim = 0; dim < mean.length; dim++) {
        const avg = averages[dim] / count;
        averages[dim] = Math.round(100 * avg) / 100;
      }

      console.log('mean', mean, 'averages', averages, 'count', count)

      // If cluster centroid (mean) is not longer assigned to any points,
      // move it somewhere else randomly within range of points.
      if (!count) {
        return this.getRandomSeeds(this.dimensionStats)[0];
      }

      // If current means does not equal to new means, then
      // move cluster centroid closer to average point.
      for (let dim = 0; dim < mean.length; dim++) {
        if (Math.round(mean[dim] * 100) == Math.round(averages[dim] * 100)) continue;

        moved = true;

        const diff = averages[dim] - mean[dim];
        if (Math.abs(diff) > 0.1) {
          mean[dim] += diff / 10;
          mean[dim] = Math.round(mean[dim] * 100) / 100;
        }
        else {
          mean[dim] = averages[dim];
        }
      }

      return mean;
    })

    console.log('this.means', this.means)

    return moved;
  }

  run() {
    this.iterations++;

    // Reassign points to nearest cluster centroids.
    this.assignments = this.assignClusterToDataPoints();

    console.log('this.assignments', this.assignments)

    this.draw()

    const meansMoved = this.moveMeans();
    console.log('meansMoved', meansMoved)
    this.draw()


    if (meansMoved && this.iterations < 250) {
      setTimeout(() => this.run(), 150);
    }
    else {
      console.log('done')
    }
  }

  /**
  * assignClusterToDataPoints
  * @desc Calculate Euclidean distance between each point and the cluster center.
  * Assigns each point to closest mean point.
  *
  * The distance between two points is the length of the path connecting them.
  * The distance between points P(p1,p2) and Q(q1,q2) is given by the Pythagorean theorem.
  *
  * distance = square root of ((p1 - q1)^2 + (p2 - q2)^2)
  *
  * For n dimensions, ie P(p1,p2,pn) and Q(q1,q2,qn).
  * d(p,q) = square root of ((p1 - q1)^2 + (p2 - q2)^2 + ... + (pn - qn)^2)
  *
  * http://en.wikipedia.org/wiki/Euclidean_distance
  */
  assignClusterToDataPoints() {
    return this.data.map(point => {
      const distances = this.means.map(mean => this.getDistance(mean, point))
      return distances.indexOf(Math.min.apply(null, distances))
    })
  }

  getDistance(point1, point2) {
    let sum = 0;
    for (let i = 0; i < point1.length; i++) {
      sum += Math.pow(point1[i] - point2[i], 2)
    }
    return Math.sqrt(sum);
  }

}

function fillArray(length, val) {
  return Array.apply(null, Array(length)).map(function() { return val; });
}

const data = [

  // [1, 5],
  // [5, 1],
  // [2, 3],
  // [3, 4],

  [ 6, 5 ],
  [ 9, 10 ],
  [ 10, 1 ],
  [ 5, 5 ],
  [ 7, 7 ],
  [ 4, 1 ],
  [ 10, 7 ],
  [ 6, 8 ],
  [ 10, 2 ],
  [ 9, 4 ],
  [ 2, 5 ],
  [ 9, 1 ],
  [ 10, 9 ],
  [ 2, 8 ],
  // [ 1, 1 ],
  // [ 6, 10 ],
  // [ 3, 8 ],
  // [ 2, 3 ],
  // [ 7, 9 ],
  // [ 7, 7 ],
  // [ 3, 6 ],
  // [ 5, 8 ],
  // [ 7, 5 ],
  // [ 10, 9 ],
  // [ 10, 9 ],
];

for (let i = 0; i < 40; i++) {
  data.push([
    Math.random() * 50,
    Math.random() * 50,
  ])
}

new KMeans({
  canvas: document.getElementById('canvas'),
  data,
  k: 5,
})