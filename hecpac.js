"use-strict";

hecpac = (function(){
    var validateRequest = function(request) {
        if (typeof request !== "object") throw new Error("No request object given");
        if (!Array.isArray(request.items)) throw new Error("Request must have items array");
        request.items.forEach(function(item, index) {
            if (typeof item !== "object") throw new Error("Item " + index + " is not an object");
            if (!Number.isInteger(item.width) || item.width < 0) throw new Error("Item " + index + " must have positive width");
            if (!Number.isInteger(item.length) || item.length < 0) throw new Error("Item " + index + " must have positive length");

            if (typeof item.weight === "undefined") {
                item.weight = 0;
            }
            if (!Number.isInteger(item.weight) || item.weight < 0) throw new Error("Item " + index + " must have positive weight");

            if (typeof item.cost === "undefined") {
                item.cost = 0;
            }
            if (!Number.isInteger(item.cost) || item.cost < 0) throw new Error("Item " + index + " must have positive cost");
        });
        if (typeof request.bin !== "object") throw new Error("Request must have bin");
        if (!Number.isInteger(request.bin.width) || request.bin.width < 0) throw new Error("Bin must have positive width");
        if (!Number.isInteger(request.bin.length) || request.bin.length < 0) throw new Error("Bin must have positive length");

        if (typeof request.bin.maximumWeight === "undefined") {
            request.bin.maximumWeight = Number.MAX_SAFE_INTEGER;
        }

        if (!Number.isInteger(request.bin.maximumWeight) || request.bin.maximumWeight < 0) throw new Error("Bin maximum weight must be positive");
    };

    var enumerate = function(items) {
        return items.map(function(item, idx) {
            return {
                index: idx,
                item: item
            };
        });
    };

    var biggestAreaFirstStrategy = function(enumeratedItems) {
        var result = enumeratedItems.slice();
        result.sort(function(a,b) {
            return b.item.width * b.item.length - a.item.width * a.item.length;
        });
        return result;

    };

    var costPerArea = function(item) {
        return item.cost / (item.width * item.length);
    };

    var highestCostPerAreaFirstStrategy = function(enumeratedItems) {
        var result = enumeratedItems.slice();
        result.sort(function(a,b) {
            return costPerArea(b.item) - costPerArea(a.item);
        });
        return result;
    };

    var costPerWeight = function(item) {
        if (item.cost == 0 && item.weight == 0) return 0;
        return item.cost / item.weight;
    };

    var highestCostPerWeightFirstStrategy = function(enumeratedItems) {
        var result = enumeratedItems.slice();
        result.sort(function(a,b) {
            return costPerWeight(b.item) - costPerWeight(a.item);
        });
        return result;
    };

    var packWithStrategy = function(request, strategy) {
        var enumeratedItems = enumerate(request.items);
        var items = strategy(enumeratedItems);

        var spaces = [{
            x: 0,
            y: 0,
            width: request.bin.width,
            length: request.bin.length
        }];

        var result = {
            packedItems: [],
            packedItemsCost: 0,
            packedItemsWeight: 0,
            remainingItems: [],
            remainingItemsCost: 0,
            remainingItemsWeight: 0,
            strategy: strategy.name
        };

        for (var i = 0; i < items.length; ++i) {
            var index = items[i].index;
            var item = items[i].item;

            var wouldOverloadBin = result.packedItemsWeight + item.weight > request.bin.maximumWeight;
            var update = placeItem(spaces, item); //FIXME: Inefficient.
            if (!wouldOverloadBin && update.place) {
                // We placed the item
                spaces = update.spacesRemaining;
                result.packedItems.push({
                    index: index,
                    place: update.place
                });
                result.packedItemsCost += item.cost;
                result.packedItemsWeight += item.weight;
            } else {
                // We couldn't place the item. As our
                // space can only get smaller there's no use
                // retrying to place it either.
                result.remainingItemsCost += item.cost;
                result.remainingItemsWeight += item.weight;
                result.remainingItems.push(index);
            }
        }

        return result;
    };

    var pack = function(request) {
        var start = Date.now();
        validateRequest(request);

        // Assumption:
        // Neither of our pre-sort-strategies is very usable as a generic strategy
        // and can be easily tripped up. In general we assume we are either weight
        // or area constrained which highest cpa and cpw try to map. However it would
        // be easy to trip them up. As we are pretty fast we also throw in our old
        // biggest area first strategy which optimizes volume packed regardless of
        // cost or weight.
        var strategies = [
            highestCostPerAreaFirstStrategy,
            highestCostPerWeightFirstStrategy,
            biggestAreaFirstStrategy
        ];

        var results = strategies.map(function(strategy, index) {
            return packWithStrategy(request, strategy);
        });

        results.sort(function(a,b) {
            return a.remainingItemsCost - b.remainingItemsCost;
        });

        var elapsedInMs = (Date.now() - start);

        results[0].timeTakenInMs = elapsedInMs;
        return results[0];
    };

    /**
     * Places items using guillotine rectangle packing.
     *
     * @param spaces Rectangles of non-overlapping free space
     * @param item Item to place
     * @returns {{spacesRemaining: updated list of free rectangles, place: Placement of the item. Undefined if none found.}}
     */
    var placeItem = function(spaces, item) {
        var remainingSpaces = [];
        var place = undefined;

        for(var i = 0; i < spaces.length; ++i) {
            var space = spaces[i];

            //TODO: Clean this up
            var canPlaceHereRotated = !place
                && item.width <= space.length
                && item.length <= space.width;

            var canPlaceHere = !place
                && item.width <= space.width
                && item.length <= space.length;

            if (canPlaceHere || canPlaceHereRotated) {
                place = {
                    x: space.x,
                    y: space.y,
                    width: canPlaceHere ? item.width : item.length,
                    length: canPlaceHere ? item.length : item.width
                };

                // Guillotine horizontal split:
                // First split split off the space right of the item,
                // then everything below.
                // That leaves us with a space right of the placed
                // item and a space below it.
                var spaceRight = {
                    x: place.x + place.width,
                    y: space.y,
                    width: space.width - place.width,
                    length: place.length
                };

                if (spaceRight.width > 0 && spaceRight.length > 0) {
                    remainingSpaces.push(spaceRight);
                }

                var spaceBelow = {
                    x: space.x,
                    y: place.y + place.length,
                    width: space.width,
                    length: space.length - place.length
                };

                if (spaceBelow.width > 0 && spaceBelow.length > 0) {
                    remainingSpaces.push(spaceBelow);
                }
            } else {
                remainingSpaces.push(space);
            }
        }
        //TODO: Should try rectangle merging

        return {
            spacesRemaining: remainingSpaces,
            place: place
        }
    };

    return {
        _placeItem: placeItem,
        _enumerate: enumerate,
        _highestCostPerAreaFirstStrategy: highestCostPerAreaFirstStrategy,
        _highestCostPerWeightFirstStrategy: highestCostPerWeightFirstStrategy,
        pack: pack
    };
})();