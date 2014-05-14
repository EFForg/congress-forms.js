 ; // close other statements for safety
(function($, window, document, undefined) {

  // This code is based off the jquery boilerplate project

  // Create the defaults once
  var pluginName = "contactCongress";
  var defaults = {
    contactCongressServer: 'https://congressforms.eff.org',
    labels: true,
    bioguide_ids: [],
    labelClasses: '',
    textInputClasses: 'form-control',
    textareaClasses: 'form-control',
    formClasses: 'form',
    selectInputClasses: 'form-control',
    formGroupClasses: 'form-group',
    legislatorLabelClasses: '',
    submitClasses: 'btn',
    success: function () {},
    onRender: function () {},
    error: function () {}
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

      var form = $('<form/>').addClass(this.settings.formClasses);
      this.retrieveFormElements(form);
      //console.log(form);
      $(form).on('submit', this.submitForm.bind(this));
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
    submitForm: function (ev) {
      //console.log(this, 'a')
      this.settings.success();
      return false;
    },
    generateForm: function(groupedData, form) {
      var that = this;


      var required_actions = groupedData.common_fields;

      // Generate a <fieldset> for common fields
      var commonFieldsFieldSet = $('<fieldset/>');
      //commonFieldsFieldSet.append('<legend>Common Fields</legend>');
      $.each(required_actions, function(index, field) {
        var form_group = that.generateFormGroup(field);
        commonFieldsFieldSet.append(form_group);
      });
      form.append(commonFieldsFieldSet);

      // Generate a <fieldset> for each extra legislator fields
      $.each(groupedData.individual_fields, function(legislator, fields) {
        console.log(legislator);
        var fieldset = $('<fieldset/>').attr('id', legislator);
        fieldset.append($('<label>').text(legislator).addClass(that.settings.legislatorLabelClasses));
        //fieldset.append('<legend>' + legislator + '</legend>');
        $.each(fields, function(index, field) {
          var form_group = that.generateFormGroup(field);
          fieldset.append(form_group);
        });
        form.append(fieldset);
      })

      // Attach submit button
      var submitButton = $('<input type="submit"/>');
      submitButton.addClass(that.settings.submitClasses);
      form.append(submitButton);

      $(that.element).append(form);
      that.settings.onRender();
    },
    generateFormGroup: function(field) {
      var that = this;
      var label_name = that._format_label(field.value);
      var field_name = field.value;

      // Create a container for each label and input, defaults to bootstrap classes
      var form_group = $('<div/>').addClass(this.settings.formGroupClasses);


      // Generate the label
      if (that.settings.labels) {
        var label = $('<label/>')
          .text(label_name)
          .attr('for', field_name)
          .addClass(this.settings.labelClasses);

        form_group.append(label);
      }

      // Generate the input
      if (field.options_hash !== null || field.value === '$ADDRESS_STATE_POSTAL_ABBREV' || field.value === '$ADDRESS_STATE') {

        var input = $('<select/>');
        input.addClass(that.settings.selectInputClasses);

        field.options = [];
        if(field.value === '$ADDRESS_STATE_POSTAL_ABBREV' || field.value === '$ADDRESS_STATE') {
          field.options = that._data.STATES;
          delete field.options_hash;
        }
        // If options_hash is an array of objects
        if (field.options_hash && $.isArray(field.options_hash) && typeof field.options_hash[0] === 'object') {
          var temp_options_hash = {};
          $.each(field.options_hash, function(option, key) {
            // Loop through properties of nested object
            $.each(option, function(prop, propName) {
              temp_options_hash[propName] = prop;
            });
          });
          field.options_hash = temp_options_hash;
        }
        // If options_hash an object?
        if (field.options_hash && !$.isArray(field.options_hash)) {
          $.each(field.options_hash, function(option, key) {
            field.options.push({
              name: option,
              value: key
            });
          });
          delete field.options_hash;
        };
        //console.log(typeof field.options_hash)
        if (typeof field.options_hash === 'string' || !field.options_hash) {
          field.options_hash = [];
        }
        $.each(field.options_hash, function(key, option) {
          var optionEl = $('<option/>')
            .attr('value', option)
            .text(option);
          input.append(optionEl);
        });
        $.each(field.options, function(key, option) {
        	//console.log(option);
          var optionEl = $('<option/>')
            .attr('value', option.value)
            .text(option.name);
          input.append(optionEl);
        });
      } else if(field_name === '$MESSAGE') {

        var input = $('<textarea />')
          .attr('id', field_name)
          .attr('placeholder', label_name);
        input.addClass(that.settings.textareaClasses);
      } else {
        var input = $('<input type="text" />')
          .attr('placeholder', label_name);
        input.addClass(that.settings.textInputClasses);

      }
      if(that.settings.values && typeof that.settings.values[field_name] !== 'undefined') {
        input.val(that.settings.values[field_name]);
      }

      input.attr('id', field_name).attr('name', field_name);
      form_group.append(input);
      return form_group;
    },
    groupCommonFields: function(data) {
      // TODO - This needs a refactor, don't think this was done well
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
            if (field.options_hash === null) {
              // Option hashes make it difficult for their to be a common field
              if (typeof common_field_counts[field.value] === 'undefined') {
                common_field_counts[field.value] = [bioguide_id];
              } else {
                common_field_counts[field.value].push(bioguide_id);
              }
            } else {
              if (typeof groupedData.individual_fields[bioguide_id] === 'undefined') {
                groupedData.individual_fields[bioguide_id] = [field];
              } else {
                groupedData.individual_fields[bioguide_id].push(field);
              }
            }
          });
        });


        var common_fields = [];
        $.each(common_field_counts, function(field, bioguide_ids) {

          // Common fields should have all legislators onboard
          if (bioguide_ids.length > 1) {
            groupedData.common_fields.push({
              value: field,
              options_hash: null
            });
          } else {
            $.each(bioguide_ids, function(index, bioguide_id) {
              if (typeof groupedData.individual_fields[bioguide_id] === 'undefined') {
                groupedData.individual_fields[bioguide_id] = [{
                  value: field,
                  options_hash: null
                }];
              } else {
                groupedData.individual_fields[bioguide_id].push({
                  value: field,
                  options_hash: null

                });
              }
            });

          }

        });
      } else {
        // If we only have 1 legislator, their fields are the common fields
        groupedData.common_fields = data[that.settings.bioguide_ids[0]].required_actions;
      }
      //console.log(groupedData);
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
    },
    _data: {
      STATES: [{
        name: 'ALABAMA',
        value: 'AL'
      }, {
        name: 'ALASKA',
        value: 'AK'
      }, {
        name: 'AMERICAN SAMOA',
        value: 'AS'
      }, {
        name: 'ARIZONA',
        value: 'AZ'
      }, {
        name: 'ARKANSAS',
        value: 'AR'
      }, {
        name: 'CALIFORNIA',
        value: 'CA'
      }, {
        name: 'COLORADO',
        value: 'CO'
      }, {
        name: 'CONNECTICUT',
        value: 'CT'
      }, {
        name: 'DELAWARE',
        value: 'DE'
      }, {
        name: 'DISTRICT OF COLUMBIA',
        value: 'DC'
      }, {
        name: 'FEDERATED STATES OF MICRONESIA',
        value: 'FM'
      }, {
        name: 'FLORIDA',
        value: 'FL'
      }, {
        name: 'GEORGIA',
        value: 'GA'
      }, {
        name: 'GUAM',
        value: 'GU'
      }, {
        name: 'HAWAII',
        value: 'HI'
      }, {
        name: 'IDAHO',
        value: 'ID'
      }, {
        name: 'ILLINOIS',
        value: 'IL'
      }, {
        name: 'INDIANA',
        value: 'IN'
      }, {
        name: 'IOWA',
        value: 'IA'
      }, {
        name: 'KANSAS',
        value: 'KS'
      }, {
        name: 'KENTUCKY',
        value: 'KY'
      }, {
        name: 'LOUISIANA',
        value: 'LA'
      }, {
        name: 'MAINE',
        value: 'ME'
      }, {
        name: 'MARSHALL ISLANDS',
        value: 'MH'
      }, {
        name: 'MARYLAND',
        value: 'MD'
      }, {
        name: 'MASSACHUSETTS',
        value: 'MA'
      }, {
        name: 'MICHIGAN',
        value: 'MI'
      }, {
        name: 'MINNESOTA',
        value: 'MN'
      }, {
        name: 'MISSISSIPPI',
        value: 'MS'
      }, {
        name: 'MISSOURI',
        value: 'MO'
      }, {
        name: 'MONTANA',
        value: 'MT'
      }, {
        name: 'NEBRASKA',
        value: 'NE'
      }, {
        name: 'NEVADA',
        value: 'NV'
      }, {
        name: 'NEW HAMPSHIRE',
        value: 'NH'
      }, {
        name: 'NEW JERSEY',
        value: 'NJ'
      }, {
        name: 'NEW MEXICO',
        value: 'NM'
      }, {
        name: 'NEW YORK',
        value: 'NY'
      }, {
        name: 'NORTH CAROLINA',
        value: 'NC'
      }, {
        name: 'NORTH DAKOTA',
        value: 'ND'
      }, {
        name: 'NORTHERN MARIANA ISLANDS',
        value: 'MP'
      }, {
        name: 'OHIO',
        value: 'OH'
      }, {
        name: 'OKLAHOMA',
        value: 'OK'
      }, {
        name: 'OREGON',
        value: 'OR'
      }, {
        name: 'PALAU',
        value: 'PW'
      }, {
        name: 'PENNSYLVANIA',
        value: 'PA'
      }, {
        name: 'PUERTO RICO',
        value: 'PR'
      }, {
        name: 'RHODE ISLAND',
        value: 'RI'
      }, {
        name: 'SOUTH CAROLINA',
        value: 'SC'
      }, {
        name: 'SOUTH DAKOTA',
        value: 'SD'
      }, {
        name: 'TENNESSEE',
        value: 'TN'
      }, {
        name: 'TEXAS',
        value: 'TX'
      }, {
        name: 'UTAH',
        value: 'UT'
      }, {
        name: 'VERMONT',
        value: 'VT'
      }, {
        name: 'VIRGIN ISLANDS',
        value: 'VI'
      }, {
        name: 'VIRGINIA',
        value: 'VA'
      }, {
        name: 'WASHINGTON',
        value: 'WA'
      }, {
        name: 'WEST VIRGINIA',
        value: 'WV'
      }, {
        name: 'WISCONSIN',
        value: 'WI'
      }, {
        name: 'WYOMING',
        value: 'WY'
      }]
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
