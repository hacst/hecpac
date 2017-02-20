"use-strict";

describe("The highestCostPerWeightFirstStrategy", function() {
    it("should correctly sort", function() {
        var items = hecpac._enumerate([
            {
                width: 100,
                length: 100,
                weight: 10,
                cost: 10
            },
            {
                width: 10,
                length: 10,
                weight: 10,
                cost: 20
            }
        ]);
        var result = hecpac._highestCostPerWeightFirstStrategy(items);
        expect(result).toEqual([items[1], items[0]]);
    });
});

describe("The highestCostPerAreaFirstStrategy", function() {
    it("should correctly sort", function() {
        var items = hecpac._enumerate([
            {
                width: 100,
                length: 100,
                weight: 1000,
                cost: 20
            },
            {
                width: 10,
                length: 10,
                weight: 10,
                cost: 10
            }
        ]);
        var result = hecpac._highestCostPerAreaFirstStrategy(items);
        expect(result).toEqual([items[1], items[0]]);
    });
});

describe("The bin management", function() {
    it("should reject placement in too small a space", function() {
        var before = [{
            x:0, y:0,
            width: 100, length: 100
        }];

        var item = {width:101, length:10};

        var result = hecpac._placeItem(before, item);
        expect(result.place).toBeUndefined();
        expect(result.spacesRemaining).toEqual(before);
    });

    it("should correctly split space", function() {
        var before = [{
            x:0, y:0,
            width: 100, length: 100
        }];

        var item = {width:10, length:10};

        var after = [{
            x:10, y:0,
            width:90, length: 10
        }, {
            x:0, y: 10,
            width: 100, length: 90
        }];

        var placement = {
            x:0, y: 0,
            width: 10, length: 10
        };

        var result = hecpac._placeItem(before, item);
        expect(result.spacesRemaining).toEqual(after);
        expect(result.place).toEqual(placement);
    });

    it("should not create remaining spaces with zero area", function() {
        var before = [{
            x:0, y:0,
            width: 100, length: 100
        }];

        var item = {width:100, length:100};

        var placement = {
            x:0, y: 0,
            width: 100, length: 100
        };

        var result = hecpac._placeItem(before, item);
        expect(result.spacesRemaining).toEqual([]);
        expect(result.place).toEqual(placement);
    });

    it("should rotate the item if needed", function() {
        var before = [{
            x:0, y:0,
            width: 100, length: 10
        }];

        var item = {width:10, length:100};

        var placement = {
            x:0, y: 0,
            width: 100, length: 10
        };

        var result = hecpac._placeItem(before, item);
        expect(result.spacesRemaining).toEqual([]);
        expect(result.place).toEqual(placement);
    });
});

describe("The packing algorithm", function() {
    it("should throw if an invalid problem description is given", function() {
        expect(function() { hecpac.pack() }).toThrowError();
        expect(function() { hecpac.pack({}) }).toThrowError();
        expect(function() { hecpac.pack({
            bin : {}
        }) }).toThrowError();
        expect(function() { hecpac.pack({
            items: [],
            bin : { width: -5, length: 1 }
        }) }).toThrowError();
        expect(function() { hecpac.pack({
            items: [{width:2, length: -3}],
            bin : { width: 0, length: 1 }
        }) }).toThrowError();
    });

    it("should return an empty result if an empty problem is given", function() {
        var emptyProblem = {
            items: [],
            bin: {
                width: 100,
                length: 100
            }
        };

        var result = hecpac.pack(emptyProblem);
        expect(result.packedItems).toEqual([]);
        expect(result.packedItemsCost).toEqual(0);
        expect(result.packedItemsWeight).toEqual(0);
        expect(result.remainingItems).toEqual([]);
        expect(result.remainingItemsCost).toEqual(0);
        expect(result.remainingItemsWeight).toEqual(0);
    })

    it("should correctly place multiple items", function() {
        var item = {
            width: 10,
            length: 10
        };

        var emptyProblem = {
            items: [item, item],
            bin: {
                width: 10,
                length: 20
            }
        };

        var result = hecpac.pack(emptyProblem);

        var itemAt = function(idx, x,y) {
            return {
                index: idx,
                place: {
                    x: x, y: y,
                    width: 10, length: 10
                }
            };
        };

        expect(result.packedItems).toEqual([
            itemAt(0,0,0), itemAt(1,0,10)
        ]);
        expect(result.remainingItems).toEqual([]);
    });

    it("should correctly fill as many items as it can and leave the rest", function() {
        var item = {
            width: 10,
            length: 10
        };

        var request = {
            items: [item, item, item, item, item],
            bin: {
                width: 20,
                length: 20
            }
        };

        var result = hecpac.pack(request);

        var itemAt = function(idx, x,y) {
            return {
                index: idx,
                place: {
                    x: x, y: y,
                    width: 10, length: 10
                }
            };
        };

        expect(result.packedItems).toEqual([
            itemAt(0,0,0), itemAt(1,10,0),
            itemAt(2,0,10), itemAt(3,10,10)
        ]);
        expect(result.packedItemsCost).toEqual(0);
        expect(result.packedItemsWeight).toEqual(0);
        expect(result.remainingItems).toEqual([4]);
        expect(result.remainingItemsCost).toEqual(0);
        expect(result.remainingItemsWeight).toEqual(0);
    });

    it("should keep track of weight and cost", function() {
        var result = hecpac.pack({
            bin: {
                width: 100,
                length: 100,
                maximumWeight: 10
            },
            items: [{
                width: 10,
                length: 10,
                weight: 12
            }, {
                width: 10,
                length: 10,
                weight: 3
            }, {
                width: 10,
                length: 10,
                weight: 3
            }]
        });

        expect(result.packedItemsCost).toEqual(0);
        expect(result.packedItemsWeight).toEqual(6);
        expect(result.remainingItems).toEqual([0]);
        expect(result.remainingItemsCost).toEqual(0);
        expect(result.remainingItemsWeight).toEqual(12);
    });
});