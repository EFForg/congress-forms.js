 ; // close other statements for safety
(function($, window, document, undefined) {

  // This code is based off the jquery boilerplate project

  // Create the defaults once
  var pluginName = "contactCongress";
  var defaults = {
    contactCongressServer: 'https://congressforms.eff.org',
    labels: true,
    // Debug, doesn't send emails just triggers error and success callbacks
    debug: false,
    values: {},
    bioguide_ids: [],
    labelClasses: '',
    textInputClasses: 'form-control',
    textareaClasses: 'form-control',
    formClasses: 'form',
    selectInputClasses: 'form-control',
    formGroupClasses: 'form-group',
    legislatorLabelClasses: '',
    submitClasses: 'btn',
    // Callbacks
    success: function () {},
    onRender: function () {},

    // Legislator callbacks are called for each email ajax request
    onLegislatorSubmit: function (legislatorId, legislatorFieldset) {},
    onLegislatorCaptcha: function (legislatorId, legislatorFieldset) {},
    onLegislatorCaptchaSubmit: function (legislatorId, legislatorFieldset) {},
    onLegislatorCaptchaSuccess: function (legislatorId, legislatorFieldset) {},
    onLegislatorCaptchaError: function (legislatorId, legislatorFieldset) {},
    onLegislatorSuccess: function (legislatorId, legislatorFieldset) {},
    onLegislatorError: function (legislatorId, legislatorFieldset) {},

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

    completedEmails: 0,
    legislatorCount: 0,

    init: function() {
      var that = this;

      var form = $('<form/>').addClass(this.settings.formClasses);
      this.retrieveFormElements(form);
      //console.log(form);
      $(form).on('submit', this.submitForm.bind(this));

      // Detect click of captcha form
      $('body').on('click', '.' + pluginName + '-captcha-button', function (ev) {
        var answerEl = $(ev.currentTarget).parents('.' + pluginName + '-captcha-container').find('.' + pluginName + '-captcha');
        that.submitCaptchaForm(answerEl);
      });
      // Detect enter key on input
      $('body').on('keypress', '.' + pluginName + '-captcha', function(ev) {
        if(ev.which == 13) {
          var answerEl = $(ev.currentTarget);
          that.submitCaptchaForm(answerEl);
        }
      });
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
      var that = this;



      var form = $(ev.currentTarget);
      // Select common field set
      var commonFieldset = $('#' + pluginName + '-common-fields', form);
      var commonData = commonFieldset.serializeObject();
      //console.log(commonData);
      if($('.' + pluginName + '-legislator-fields').length > 0 ){
        $.each($('.' + pluginName + '-legislator-fields'), function(index, legislatorFieldset) {
          var legislatorId = $(legislatorFieldset).attr('data-legislator-id');
          var legislatorData = $(legislatorFieldset).serializeObject();
          console.log(legislatorId, legislatorFieldset, legislatorData);
          var fullData = $.extend({}, commonData, legislatorData);
          var captcha_uid = that.generateUID();
          that.settings.onLegislatorSubmit(legislatorId, $(legislatorFieldset));
          if(that.settings.debug) {
            // Simulate error and success per legislator 50/50 of the time
            setTimeout(function () {
              var randomNumber = Math.ceil(Math.random() * 3);
              switch (randomNumber) {
                case 1:
                  that.settings.onLegislatorSuccess(legislatorId, $(legislatorFieldset));
                  break;
                case 2:
                  that.settings.onLegislatorError(legislatorId, $(legislatorFieldset));
                  break;
                case 3:

                  var captchaForm = that.generateCaptchaForm('http://i.imgur.com/BG2yMUp.png', legislatorId, captcha_uid);
                  $(legislatorFieldset).append(captchaForm);
                  that.settings.onLegislatorCaptcha(legislatorId, $(legislatorFieldset));

                  break;
              }
            }, 500);
          } else {

            $.ajax({
              url: that.settings.contactCongressServer + '/fill-out-form',
              type: 'post',
              data: {
                bio_id: legislatorId,
                uid: captcha_uid,
                fields: fullData
              },
              success: function( data ) {
                if(data.status === 'success') {
                  that.settings.onLegislatorSuccess(legislatorId, $(legislatorFieldset));
                  //SUCCESS GOES HERE
                } else if (data.status === 'captcha_needed'){
                  var captchaForm = that.generateCaptchaForm(data.url, legislatorId, captcha_uid);
                  $(legislatorFieldset).append(captchaForm);
                  that.settings.onLegislatorCaptcha(legislator, $(legislatorFieldset));
                } else {
                  that.settings.onLegislatorError(legislatorId, $(legislatorFieldset));
                }
                //console.log(arguments);
              }
            });

          }

        });
      } else {
        // There is only one legislator
        var legislator = that.settings.bioguide_ids[0];

        var captcha_uid = that.generateUID();
        if(that.settings.debug) {
          // Simulate error and success per legislator 50/50 of the time
          setTimeout(function () {
            var randomNumber = Math.ceil(Math.random() * 3);
            switch (randomNumber) {
              case 1:
                that.settings.onLegislatorSuccess(legislator, $(commonFieldset));
                break;
              case 2:
                that.settings.onLegislatorError(legislator, $(commonFieldset));
                break;
              case 3:
                var captchaForm = that.generateCaptchaForm('http://i.imgur.com/BG2yMUp.png', legislator, captcha_uid);
                $(commonFieldset).append(captchaForm);
                that.settings.onLegislatorCaptcha(legislator, $(commonFieldset));
                break;
            }
          }, 500);
        } else {

          $.ajax({
            url: that.settings.contactCongressServer + '/fill-out-form',
            type: 'post',
            data: {
              bio_id: legislator,
              uid: captcha_uid,
              fields: commonData
            },
            success: function( data ) {
              if(data.status === 'success') {
                that.settings.onLegislatorSuccess(legislator, $(commonFieldset));
                //SUCCESS GOES HERE
              } else if (data.status === 'captcha_needed'){
                var captchaForm = that.generateCaptchaForm(data.url, legislator, captcha_uid);
                $(commonFieldset).append(captchaForm);
                that.settings.onLegislatorCaptcha(legislator, $(commonFieldset));
              } else {
                that.settings.onLegislatorError(legislator, $(commonFieldset));
              }
              //console.log(arguments);
            }
          });
        }
      }
      // Disable inputs after we serialize their values otherwise they won't be picked up
      $('input, textarea, select, button' , form).attr('disabled', 'disabled');
      return false;
      // Some hardcoded zip 4 thing
      data['$ADDRESS_ZIP4'] = 1623;
      data['$TOPIC'] = 'AGR';
      data['$NAME_PREFIX'] = 'MR';
      //console.log(data);


      /*
          var that = this;
      that.$el.find('input, textarea, button, select').attr('disabled', 'disabled');
      if(Data.legislators[that.model.get('bioguide_id')]) {
        var zip4 =  Data.legislators[that.model.get('bioguide_id')].zip4;
        data['$ADDRESS_ZIP4'] = zip4;
      }
      $.ajax({
        url: config.CONTACT_CONGRESS_SERVER + '/fill-out-form',
        type: 'post',
        data: {
          bio_id: this.model.get('bioguide_id'),
          uid: that.captcha_uid,
          fields: data
        },
        success: function( data ) {
          console.log(arguments);
          if(data.status === 'captcha_needed') {
            $('.captcha-container').append(Mustache.render(captchaTemplate, {captcha_url: data.url}));
          } else if (data.status === 'error') {
            that.$el.find('input, textarea, button, select').removeAttr('disabled');
            $('.form-error').slideDown(200).delay(4500).slideUp(200);
            Events.trigger('BIOGUIDE_ERROR');

          } else {
            $('.form-success').slideDown(200);
          }
        }
      });

      return false;
      */
      this.settings.success();
      return false;
    },
    generateForm: function(groupedData, form) {
      var that = this;


      var required_actions = groupedData.common_fields;

      // Generate a <fieldset> for common fields
      var commonFieldsFieldSet = $('<fieldset/>').attr('id', pluginName + '-common-fields');
      //commonFieldsFieldSet.append('<legend>Common Fields</legend>');
      $.each(required_actions, function(index, field) {
        var form_group = that.generateFormGroup(field);
        commonFieldsFieldSet.append(form_group);
      });
      form.append(commonFieldsFieldSet);

      // Generate a <fieldset> for each extra legislator fields
      $.each(groupedData.individual_fields, function(legislator, fields) {
        //console.log(legislator);
        var fieldset = $('<fieldset/>').attr('data-legislator-id', legislator).addClass(pluginName + '-legislator-fields');
        fieldset.append($('<label>').text(legislator).addClass(that.settings.legislatorLabelClasses));
        //fieldset.append('<legend>' + legislator + '</legend>');
        $.each(fields, function(index, field) {
          var form_group = that.generateFormGroup(field);
          fieldset.append(form_group);
        });
        form.append(fieldset);
      });
      if(that.settings.bioguide_ids.length === 1) {
        var legislator = that.settings.bioguide_ids[0];
        commonFieldsFieldSet.attr('data-legislator-id', legislator).addClass(pluginName + '-legislator-fields').prepend($('<label>').text(legislator).addClass(that.settings.legislatorLabelClasses));
      }

      // Attach submit button
      var submitButton = $('<input type="submit"/>');
      submitButton.addClass(that.settings.submitClasses);
      form.append(submitButton);

      $(that.element).append(form);
      that.settings.onRender();
    },
    submitCaptchaForm : function (answerEl) {
      var that = this;
      var answer = $(answerEl).val();
      var captchaUID = $(answerEl).attr('data-captcha-uid');
      var legislatorId = $(answerEl).attr('data-captcha-legislator-id');
      var legislatorFieldset = $('fieldset[data-legislator-id="'+legislatorId+'"]');
      that.settings.onLegislatorCaptchaSubmit(legislatorId, $(legislatorFieldset));

      if(that.settings.debug) {
        var randomNumber = Math.ceil(Math.random() * 2);
        setTimeout(function () {
        switch (randomNumber) {
          case 1:
            that.settings.onLegislatorCaptchaSuccess(legislatorId, $(legislatorFieldset));
            break;
          case 2:
            that.settings.onLegislatorCaptchaError(legislatorId, $(legislatorFieldset));
            break;
        }
        }, 1500)
      } else {
        $.ajax({
          url: that.settings.contactCongressServer + '/fill-out-captcha',
          type: 'post',
          data: {
            uid: captchaUID,
            answer: answer
          },
          success: function( data ) {
            console.log('ass', arguments);
          }
        });
      }
  /*
        $.each($('.' + pluginName + '-legislator-fields'), function(index, legislatorFieldset) {
          var legislatorId = $(legislatorFieldset).attr('data-legislator-id');
          var legislatorData = $(legislatorFieldset).serializeObject();
          console.log(legislatorId, legislatorFieldset, legislatorData);
          var fullData = $.extend({}, commonData, legislatorData);
          var captcha_uid = that.generateUID();
          that.settings.onLegislatorSubmit(legislatorId, $(legislatorFieldset));
*/

      console.log('answer', answer,captchaUID, legislatorId, legislatorFieldset);
      return false;
    },
    generateCaptchaForm: function (captchaUrl, legislatorId, captchaUID) {
      var that = this;
      var formGroup = $('<div/>').addClass(pluginName +'-captcha-container');
      var label = $('<label/>').text('Type the text in the image to send your message').addClass(pluginName +'-captcha-label');
      formGroup.append(label);
      var img = $('<img/>').attr('src', captchaUrl).addClass(pluginName +'-captcha-image');
      formGroup.append(img);
      var input = $('<input/>').attr('type', 'text').addClass('form-control ' + pluginName +'-captcha')
          .attr('data-captcha-legislator-id', legislatorId)
          .attr('data-captcha-uid', captchaUID);
      formGroup.append(input);
      var submitButton = $('<button>').attr('type', 'button').addClass('btn btn-primary ' + pluginName +'-captcha-button').text('Submit Captcha');
      formGroup.append(submitButton);
      return formGroup;
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
      input.attr('required', 'required');
      var fieldData = that.fieldData;
      if(fieldData[field_name]) {
        $.each(fieldData[field_name], function (attr, attrValue) {
          input.attr(attr, attrValue);
        })
      }
      form_group.append(input);
      return form_group;
    },
    fieldData: {
      '$EMAIL': {
        'type': 'email'
      },
      '$NAME_FIRST': {
        'maxlength': '20'
      },
      '$NAME_LAST': {
        'maxlength': '20'
      },
      '$ADDRESS_ZIP5': {
        'pattern': '[0-9]{5}'
      }
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
      var manual_labels = {
        '$NAME_LAST': 'Last Name',
        '$NAME_FIRST': 'First Name'
      }
      if(typeof manual_labels[string] !== 'undefined') {
          return manual_labels[string];
      } else {
        var string_arr = string.replace("$", "").replace("_", " ").split(" ");
        return $.map(string_arr, function(word) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(" ");
      }
    },

    // Generates UID's for request to congress form server
    generateUID: function() {
      var text = "";
      var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for( var i=0; i < 10; i++ )
          text += possible.charAt(Math.floor(Math.random() * possible.length));

      return text;
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

  // Extend jquery
  $.fn.serializeObject = function() {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
       if (o[this.name]) {
           if (!o[this.name].push) {
               o[this.name] = [o[this.name]];
           }
           o[this.name].push(this.value || '');
       } else {
           o[this.name] = this.value || '';
       }
    });
    return o;
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
