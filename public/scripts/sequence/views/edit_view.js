/**
@class EditView
@module Sequence
@submodule Views
**/
define(function(require) {
  var template = require('../templates/edit_view.hbs'),
    Backbone = require('backbone.mixed'),
    Gentle = require('gentle')(),
    Sequences = require('../models/sequences'),
    EditView;

  EditView = Backbone.View.extend({
    manage: true,
    template: template,

    initialize: function() {
      this.model = Gentle.currentSequence;
    },

    events: {
      // Is there another way to write this?
      'click input[type=button]': 'readAndUpdate',
      // Debounced?
      // updateOn: 'blur'?
      'keyup input[type=text]': 'readAndUpdate'
    },

    readAndUpdate: function(event) {
      var descript = 'No Description';
      this.model.nameBefore = this.model.get('name');
      this.model.errors= {};

      event.preventDefault();
      var isCircular = this.$('[name="isCircular"]:checked').val() || "false";

      this.model.set({
        name: this.$('#name').val(),
        description: this.$('#desc').val(),
        isCircular: isCircular == "true"
      }, {
        validate: true
      });

      if (this.model.validationError != null) {
        if (this.model.validationError[0] == 'name') {
          this.model.errors.name = true;
          this.model.set('name', this.model.nameBefore);
          document.title = this.model.nameBefore + " / Gentle";
          this.model.set('desc', this.$('#desc').val());
        }
        if (this.model.validationError[0] == 'desc') {
          this.model.set('desc', descript);
          this.model.set('name', this.$('#name').val());
          document.title = this.$('#name').val() + " / Gentle";
        }
        if (this.model.validationError.length == 2) {
          this.model.set('name', this.model.nameBefore);
          this.model.set('desc', descript);
          document.title = this.model.nameBefore + " / Gentle";
        }
      } else {
        this.model.set('name', this.$('#name').val());
        this.model.set('desc', this.$('#desc').val());
        document.title = this.$('#name').val() + " / Gentle";
      }

      this.model.save();
      
      // It still works without this.render()
      // Check what render does. Seems to inject the context, and refresh the
      // state? Either backbone or underscore thing.
      
      // this.render();
    },

    serialize: function() {
      return {
        readOnly: this.model.get('readOnly'),
        Name: this.model.get('name'),
        Desc: this.model.get('desc'),
        isCircular: !!this.model.get('isCircular'),
        error: this.model.errors || {}
      };

    },
  });

  return EditView;
});