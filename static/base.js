      /**
       * Load multiple JSON files.
       *
       * Example usage:
       *
       * jQuery.getMultipleJSON('file1.json', 'file2.json')
       *   .fail(function(jqxhr, textStatus, error){})
       *   .done(function(file1, file2){})
       * ;
       */
      jQuery.getMultipleJSON = function(){
        return jQuery.when.apply(jQuery, jQuery.map(arguments, function(jsonfile){
          return jQuery.getJSON(jsonfile);
        })).then(function(){
          var def = jQuery.Deferred();
          return def.resolve.apply(def, jQuery.map(arguments, function(response){
            return response[0];
          }));
        });
      };