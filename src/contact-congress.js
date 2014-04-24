; // close other statements for safety
(function($, window, document, undefined) {

  // This code is based off the jquery boilerplate project

  // Create the defaults once
  var pluginName = "contactCongress";
  var defaults = {
    contactCongressServer: 'http://ec2-54-215-28-56.us-west-1.compute.amazonaws.com:3000',
    labels: true,
    bioguide_ids: []
    // PLACEHOLDER - inputClasses
    // PLACEHOLDER - labelClasses
    // PLACEHOLDER - formClasses
  };

  // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element;
    this.settings = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  }

  Plugin.prototype = {

    init: function() {
      var that = this;

      var form = $('<form/>').addClass('form');
      this.retrieveFormElements(form);

    },
    // Get's required form fields for the legislators and generates inputs
    retrieveFormElements: function(form) {
      var that = this;
      $.ajax({
        url: that.settings.contactCongressServer + '/retrieve-form-elements',
        type: 'post',
        data: {
          bio_ids: this.settings.bioguide_ids
        },
        success: function(data) {
          // TODO - throw on server error 
          var groupedData = that.groupCommonFields(data);
          that.generateForm(groupedData, form)
        }

      });

    },

    generateForm: function(groupedData, form) {
      var that = this;


      var required_actions = groupedData.common_fields;

      // Generate a <fieldset> for common fields
      var commonFieldsFieldSet = $('<fieldset/>');
      commonFieldsFieldSet.append('<legend>Common Fields</legend>');
      $.each(required_actions, function(index, field) {
        var form_group = that.generateFormGroup(field);
        commonFieldsFieldSet.append(form_group);
      });
      form.append(commonFieldsFieldSet);

      // Generate a <fieldset> for each extra legislator fields
      $.each(groupedData.individual_fields, function(legislator, fields) {
      	var fieldset = $('<fieldset/>');
      	fieldset.append('<legend>' + legislator + '</legend>');
	      $.each(fields, function(index, field) {
	        var form_group = that.generateFormGroup(field);
	        fieldset.append(form_group);
	      });
	      form.append(fieldset);
      })

      // Attach submit button
      var submitButton = $('<input type="submit"/>');
      form.append(submitButton);

      $(that.element).append(form);
    },
    generateFormGroup: function(field) {
      var that = this;
      var label_name = that._format_label(field.value);
      var field_name = field.value;

      // Create a container for each label and input, defaults to bootstrap classes
      var form_group = $('<div/>').addClass('form-group');


      // Generate the label
      if (that.settings.labels) {
        var label = $('<label/>')
          .text(label_name)
          .attr('for', field_name);
        form_group.append(label);
      }

      // Generate the input

      var input = $('<input type="text" />')
        .addClass('form-control')
        .attr('placeholder', label_name);

      form_group.append(input);
      return form_group;
    },
    groupCommonFields: function(data) {
      // TODO - This needs a refactor, don't think this was done
      // The following clumsy logic, compiles the groupedData object below
      var that = this;
      var groupedData = {
        common_fields: [],
        individual_fields: {}
      }
      var numberOfLegislators = that.settings.bioguide_ids.length;

      // If we have multiple legislators lets group their common fields
      if (numberOfLegislators > 1) {

        var common_field_counts = {};
        // Let's figure out which fields the legislators have in common
        // TODO - Probably a better way to do this
        $.each(this.settings.bioguide_ids, function(index, bioguide_id) {
          var legislator = data[bioguide_id];
          $.each(legislator.required_actions, function(index, field) {

            if (typeof common_field_counts[field.value] === 'undefined') {
              common_field_counts[field.value] = [bioguide_id];
            } else {
              common_field_counts[field.value].push(bioguide_id);
            }

          });
        });


        var common_fields = [];
        $.each(common_field_counts, function(field, bioguide_ids) {

          // Common fields should have all legislators onboard
          if (bioguide_ids.length > 1) {
            groupedData.common_fields.push({
              value: field
            });
          } else {
            $.each(bioguide_ids, function(index, bioguide_id) {
              if (typeof groupedData.individual_fields[bioguide_id] === 'undefined') {
                groupedData.individual_fields[bioguide_id] = [{
                  value: field
                }];
              } else {
                groupedData.individual_fields[bioguide_id].push({
                  value: field
                });
              }
            });

          }

        });
      } else {
        // If we only have 1 legislator, their fields are the common fields
        groupedData.common_fields = data[that.settings.bioguide_ids[0]].required_actions;
      }
      console.log(groupedData);
      return groupedData;
    },

    // Turns the servers required field into a more readable format
    // e.g. $NAME_FIRST -> Name First
    // TODO - Make even more readable form labels, probably manually
    _format_label: function(string) {
      var string_arr = string.replace("$", "").replace("_", " ").split(" ");
      return $.map(string_arr, function(word) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }).join(" ");
    }
  };

  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations
  $.fn[pluginName] = function(options) {
    this.each(function() {
      if (!$.data(this, "plugin_" + pluginName)) {
        $.data(this, "plugin_" + pluginName, new Plugin(this, options));
      }
    });

    // chain jQuery functions
    return this;
  };

})(jQuery, window, document);
