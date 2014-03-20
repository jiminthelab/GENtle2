define(function(require) {
  var backbone        = require('backbone'),
      SequenceView    = require('views/sequence_view'),
      HomeView        = require('views/home_view'),
      Gentle          = require('gentle'),
      Router;

  Gentle = Gentle();

  Router = Backbone.Router.extend({

    routes: {
      '':               'index',
      'home':           'home',
      'sequence/:id':   'sequence',
      '*nomatch':       'notFound'
    },

    index: function() {
      if(Gentle.sequences.length) {
        this.sequence(Gentle.sequences.last().get('id'));  
      } else {
        this.home();
      }
    },

    home: function() {
      if(Backbone.history.fragment != 'home') this.navigate('home', {trigger: true});
      else {
        Gentle.currentSequence = undefined;
        Gentle.layout.setView('#content', new HomeView());
        Gentle.layout.render();
      }
    },

    sequence: function(id) {
      fragment = 'sequence/'+id;
      if(Backbone.history.fragment != fragment) this.navigate(fragment, {trigger: true});
      else {
        Gentle.currentSequence = Gentle.sequences.get(id);
        if(Gentle.currentSequence) {
          Gentle.layout.setView('#content', new SequenceView());
          Gentle.layout.render();
        } else {
          this.notFound();
        }
      }
    },

    notFound: function() { this.home(); }
  });

  return Router;
});