define(["underscore", "backbone", "localforage"], function (_, Backbone, LocalForage) {
    function S4() {
        return ((1 + Math.random()) * 65536 | 0).toString(16).substring(1);
    }

    function guid() {
        return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4();
    }

    var Store = function (name) {
        this.data = null;
        this.name = name;
    };

    _.extend(Store.prototype, {
        save: function (callback) {
            LocalForage.setItem(this.name, JSON.stringify(this.data), callback);
        },

        create: function (model, options) {
            if (this.data) {
                if (!model.id) model.id = model.attributes.id = guid();
                this.data[model.id] = model;
                this.save(function() {
                    options.success(model);
                });
            } else {
                var self = this;

                LocalForage.getItem(this.name, function(data) {
                    self.data = JSON.parse(data) || {};

                    if (!model.id) model.id = model.attributes.id = guid();
                    self.data[model.id] = model;
                    self.save(function() {
                        options.success(model);
                    });
                });
            }
        },

        update: function (model, options) {
            if (this.data) {
                this.data[model.id] = model;
                this.save(function() {
                    options.success(model);
                });
            } else {
                var self = this;

                LocalForage.getItem(this.name, function(data) {
                    self.data = JSON.parse(data) || {};

                    self.data[model.id] = model;
                    self.save(function() {
                        options.success(model);
                    });
                });
            }
        },

        find: function (model, options) {
            if (this.data) {
                options.success(this.data[model.id]);
            } else {
                var self = this;

                LocalForage.getItem(this.name, function(data) {
                    self.data = JSON.parse(data) || {};
                    options.success(self.data[model.id]);
                });
            }
        },

        findAll: function (options) {
            if (this.data) {
                options.success(_.values(this.data));
            } else {
                var self = this;

                LocalForage.getItem(this.name, function(data) {
                    self.data = JSON.parse(data) || {};
                    options.success(_.values(self.data));
                });
            }
        },

        destroy: function (model, options) {
            if (this.data) {
                delete this.data[model.id];
                this.save(function() {
                    options.success(model);
                });
            } else {
                var self = this;

                LocalForage.getItem(this.name, function(data) {
                    self.data = JSON.parse(data) || {};

                    delete self.data[model.id];
                    self.save(function() {
                        options.success(model);
                    });
                });
            }
        }
    });

    Backbone.sync = function (method, model, options) {
        var resp;
        var store = model.localStorage || model.collection.localStorage;

        switch (method) {
            case "read":
                if (model.id) {
                    store.find(model, options);
                } else {
                    store.findAll(options);
                }
                break;
            case "create":
                store.create(model, options);
                break;
            case "update":
                store.update(model, options);
                break;
            case "delete":
                store.destroy(model, options);
                break;
        }
    };

    return Store;
});
