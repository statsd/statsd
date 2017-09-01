module.exports = function(compositions, sourceMetrics, callback) {
    Object.keys(sourceMetrics.counters).forEach(function(key){
        compositions.forEach(function(composition) {
            composition.regexp.forEach(function(metric, index) {
                var matches = key.match(metric),
                    metricName = composition.name;

                if (!composition["metrics"]) {
                    composition.metrics = {};
                }

                if (matches) {
                    matches.slice(1, matches.length).forEach(function(m, index){
                        metricName = metricName.replace("#" + index, m);
                    });

                    if(!composition.metrics[metricName]) {
                        composition.metrics[metricName] = [];
                    }

                    composition.metrics[metricName][index] = sourceMetrics.counters[key];
                }
            });
        });
    });

    compositions.forEach(function(composition){
        Object.keys(composition.metrics).forEach(function(metric){
            var result = composition.compose.apply(composition.compose, composition.metrics[metric]);

            if (Number.isNaN(result)) {
                return;
            }

            sourceMetrics.counters[metric] = result;
        });

        composition.metrics = {};
    });

    callback(sourceMetrics);
};
