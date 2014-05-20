define(function(require) {
  var template        = require('hbars!sequence/templates/sequence_view'),
      Sequence        = require('sequence/models/sequence'),
      SequenceCanvas  = require('sequence/lib/sequence_canvas'),
      Gentle          = require('gentle')(),
      SequenceSettingsView = require('sequence/views/settings_view'),
      ContextMenuView = require('common/views/context_menu_view'),
      LinearMapView   = require('linear_map/views/linear_map_view'),
      Backbone        = require('backbone.mixed'),
      SequenceView;
  
  SequenceView = Backbone.View.extend({
    manage: true,
    template: template,
    className: 'sequence-view',

    initialize: function() {
      var _this = this;

      this.model = Gentle.currentSequence;
      
      this.sequenceSettingsView = new SequenceSettingsView();
      this.setView('.sequence-sidebar', this.sequenceSettingsView);
      this.sequenceSettingsView.on('resize', function() { 
        _this.$('.sequence-canvas-container, .scrolling-parent').css('left', _this.sequenceSettingsView.$el.width());
        _this.trigger('resize');
      });
      
      this.handleResize = _.bind(this.handleResize, this);
      $(window).on('resize', this.handleResize);
      this.handleResize(false);

      this.contextMenuView = new ContextMenuView();
      this.insertView('#sequence-canvas-context-menu-outlet', this.contextMenuView);

      this.secondaryView = new LinearMapView();
      this.insertView('#sequence-canvas-secondary-view-outlet', this.secondaryView);

    },

    afterRender: function() {
      this.$('.sequence-canvas-container, .scrolling-parent').css('right',
        this.secondaryView.$el.width()
      );

      this.sequenceCanvas = new SequenceCanvas({
        view: this,
        $canvas: this.$('canvas').first()
      });

      this.contextMenuView.$assumedParent = this.$('.scrolling-parent').focus();
      this.contextMenuView.boundTo = this.sequenceCanvas;
    },

    handleResize: function(trigger) {
      if(trigger !== false) this.trigger('resize');
      // this.$el.height($(window).height() - $('#navbar .navbar').outerHeight()); 
    },

    remove: function() {
      $(window).off('resize', this.handleResize);
      Backbone.View.prototype.remove.apply(this, arguments);
    }

  });

  return SequenceView;
});