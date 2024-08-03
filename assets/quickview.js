vela.QuickView = (function() {
    var selectors = {
      body: 'body',
      quickView: '[data-quickview]',
      quickViewTemplate: '#quickview-template',
      quickViewBtn: '.js-btn-quickview',
      quickViewContainer: '[data-quickview-container]',
      quickViewClose: '[data-quickview-close]',
      quickViewImages: '[data-quickview-images]',
      quickViewReview: '[data-quickview-review]',
      quickviewVariant: '.js-quickview-option-selector',
      originalSelectorId: '[data-quickview-variant]',
      quickViewProductPrice: '.js-qv-product-price',
      quickViewProductPriceCompare: '.js-qv-product-price-compare',
      quickViewSKU: '[data-quickview-sku]',
      quickViewAvaiable: '.product-avaiable',
      quickViewAvaiableInStock: '.product-avaiable--instock',
      quickViewAvaiableInStockText: '.product-avaiable__text--instock',
      quickViewAvaiableOutStock: '.product-avaiable--outstock',
      quickViewProductDetailsURL: '.js-qv-product-details'
    };
    var preOrder = false;
    function QuickView(container) {
      this.$container = $(container);
      this.cache = {};
      this.productVariants = [];
      this.currentVariant = {};
      this.cacheSelectors();
      this.initializeEvents();
    }
  
    QuickView.prototype = _.assignIn({}, QuickView.prototype, {
      cacheSelectors: function() {
        this.cache = {
          $body: $('body'),
          $quickViewContainer: this.$container.find(selectors.quickViewContainer)
        };
      },
  
      initializeEvents: function() {
        var $this = this;
        $(selectors.body).on('click', selectors.quickViewBtn, function(e) {
          e.preventDefault();
          var productHandle = $(this).data('handle');
          preOrder = $(this).data('preorder');
          var shortProductDesc = $(this).find('.proShortDesc').html();
          
          $.getJSON('/products/' + productHandle + '.js', function(product) {
            if (product.available) {
              $this.firstAvailableVariant(product.variants, $this);
            } else {
              $this.currentVariant = product.variants[0];
            }
            $this.buildQuickView(product,shortProductDesc);
            $this.createImageCarousel();
            $this.renderReview();
            $this.show();
          });
        });
  
        $(selectors.body).on('click', selectors.quickViewClose, function(e) {
          e.preventDefault();
          $this.hide();
        });
  
        $(selectors.quickViewContainer).on('change', selectors.quickviewVariant, function(e) {
          $this.onVariantChange();
        });
      },
  
      firstAvailableVariant: function(variants, global) {
        global.productVariants = variants;
        for (var i = 0; i < variants.length; i++) {
          var variant = variants[i];
          if (variant.available) {
            global.currentVariant = variant;
            break;
          }
        }
      },
  
      buildQuickView: function(product,shortProductDesc) {
        var moneyFormat = vela.strings.moneyFormat;
        var currentVariant = this.currentVariant;
        var source = $(selectors.quickViewTemplate).html();
        var template = Handlebars.compile(source);
        var images = '';
        var price = '';
        var tags = '';
        var shortDescription = shortProductDesc;
        var qvObject = {
          id: product.id
        };
        if (product.media.length > 0) {
          images += '<div class="quickview-images__list slick-carousel mx-0" data-quickview-images>'
          for (var i = 0; i < product.media.length; i++) {
            var media = product.media[i];
            if (media.media_type === 'image') {
              images += '<div class="slick-carousel__item px-0"><div class="quickview-images__item" data-media-id=' +
                media.id + '><img class="img-fluid" alt="' +
                product.title + '" src="' +
                media.src + '" /></div></div>';
            }
          }
          images += '</div>'
        }
        qvObject.variantID = currentVariant.id;
        qvObject.sku = currentVariant.sku !== null && currentVariant.sku !== '' ? currentVariant.sku : 'N/A';
        qvObject.images = images;
        qvObject.title = product.title;
        qvObject.url = product.url;
        price += '<div class="price-container d-flex align-items-center">';
        var productCompareClass = product.compare_at_price > product.price ? '' : 'd-none';
        price += '<div class="js-qv-product-price product-single__price">' + vela.Currency.formatMoney(product.price, moneyFormat) + '</div>';
        price += '<div class="js-qv-product-price-compare product-single__price--compare-at ' + productCompareClass + '">' + vela.Currency.formatMoney(product.compare_at_price, moneyFormat) + '</div>';
        price += '</div>';
        qvObject.price = price;
        qvObject.shortDescription = shortDescription;
        qvObject.vendor = '<a href="/collections/vendors?q=' + product.type + '" title="' + product.type + '">'+ product.vendor + '</a>';
        qvObject.type = '<a href="/collections/types?q=' + product.type + '" title="' + product.type + '">' + product.type + '</a>';
        if (product.tags.length > 0) {
          var tag_lenght = product.tags.length > 2 ? 2 : product.tags.length;
          for (var i = 0; i < tag_lenght; i++) {
            if(i != 0) {
              tags += ',&nbsp;';
            }
            tags += '<a href="/collections/all/' + product.tags[i] +'" title="' + product.tags[i] +'">' + product.tags[i] +'</a>';
          }
        }
        qvObject.tags = tags;
        qvObject.variants = this.buildVariant(product);
        $(selectors.quickViewContainer).html(template(qvObject));
        // AFTER BUILD HTML
        this.updateMedia(currentVariant);
        this.updateSKU(currentVariant);
        this.updateProductAvaiable(currentVariant);
        this.updateDetailsLink(currentVariant);
        this.updateToolTip();
        // TODO: Add to cart ajax call
        this.qvAddToCart();
      },
      convertToSlug: function(str) {
        return str.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
      },
      checkIfImageExists: function(url, callback) {
        const img = new Image();
        img.src = url;
        if (img.complete) {
          callback(true);
        } else {
          img.onload = () => {
            callback(true);
          };
          
          img.onerror = () => {
            callback(false);
          };
        }
      },
      buildVariant: function(product) {
        var result = '';
        var currentVariant = this.currentVariant;
        if (product.options[0].name !== 'Title') {
          var options = product.options;
          for (var i = 0; i < options.length; i ++) {
            var option = options[i];
            var optionIndex = i + 1;
            result += '<div class="variants-wrapper product-form__item" data-quickview-variant-option="' + optionIndex + '">';
            result += '<label class="variants__label">' + option.name + '</label>';
            result += '<div class="variants__options">';
            if (vela.settings.quickViewVariantType === 'select') {
              result += '<select class="js-quickview-option-selector product-form__input form-select" data-id="quickViewOptionSelector-' + optionIndex + '" data-index="option' + optionIndex + '">';
              for (var j = 0; j < option.values.length; j ++) {
                var value = option.values[j];
                result += '<option value="' + _.escape(value) + '" ';
                result += currentVariant.options[i] === value ? 'selected="selected"' : '';
                result += '>' + value + '</option>';
              }
              result += '</select>';
            } else if (vela.settings.quickViewVariantType === 'radio') {
              for (var j = 0; j < option.values.length; j ++) {
                var value = option.values[j];
                var isDisable = true;
                var colorAttribute = '';
                // CHECK Product option is available or disabled
                for (var k = 0; k < this.productVariants.length; k ++) {
                  var variantCondition = this.productVariants[k];
                  if (variantCondition.available) {
                    if (i == 0 && variantCondition.option1 === value) {
                      isDisable = false;
                      break;
                    } else if (i == 1 && variantCondition.option2 === value && variantCondition.option1 == currentVariant.option1) {
                      isDisable = false;
                      break;
                    } else if (i == 2 && variantCondition.option3 === value && variantCondition.option2 == currentVariant.option2 && variantCondition.option1 == currentVariant.option1) {
                      isDisable = false;
                      break;
                    }
                  }
                }
                // CHECK variant color
                if (vela.settings.quickViewColorSwatch && (option.name.toLowerCase() == 'color' || option.name.toLowerCase() == 'colour')) {
                  var colorName = this.convertToSlug(value);
                  var colorName1 = value.replace(/\s/g, '');
                  var colorImageUrl = vela.settings.fileURL + colorName + '.png';
                  if (vela.settings.quickViewColorSwatch) {
                    for (var k = 0; k < this.productVariants.length; k ++) {
                      var variantCondition = this.productVariants[k];
                      if (variantCondition.available) {
                        for( var t = 0; t < variantCondition.options.length; t ++){  
                          var image_color = '';
                          var option_name =  this.convertToSlug(variantCondition.options[t]);
                          if(option_name == colorName  && variantCondition.featured_image ) {
                            image_color = variantCondition.featured_image.src;
                            break;
                          }
                        }
                        if (image_color != '') {
                          colorImageUrl = image_color; 
                          break; 
                        }
                      }
                    }
                  }
                  colorAttribute = 'data-color="' + colorName + '" ';
                  colorAttribute += 'data-qv-toggle="tooltip" title="' + value + '"';
                  colorAttribute += 'style="background-color: ' + colorName1 + ';background-image: url(' + colorImageUrl + ')"';
                }
                result += '<div class="single-option-selector">';
                result += '<input type="radio" data-single-option-button';
                result += currentVariant.options[i] === value ? ' checked ' : ' ';
                if (isDisable) {
                  result += 'disabled="disabled"';
                }
                result += 'value="' + _.escape(value) + '" data-index="option' + optionIndex + '" name="option' + option.position + '" ';
                result += 'class="js-quickview-option-selector';
                if (isDisable) {
                  result += ' disabled';
                }
                result += '" id="quickview-product-option-' + i + '-' + value.toLowerCase() + '">';
                result += '<label for="quickview-product-option-' + i + '-' + value.toLowerCase() + '" ' + colorAttribute;
                if (isDisable) {
                  result += ' class="disabled"';
                }
                result += '>' + value + '<span class="d-none"></span></label>';
                result += '</div>';
              }
            }
            result += '</div>';
            result += '</div>';
          }
        }
        return result;
      },
      
  
      createImageCarousel: function() {
        $(selectors.quickView).find(selectors.quickViewImages).slick({
          infinite: false,
          rows: 0
        });
      },
  
      renderReview: function() {
        if (window.SPR && vela.settings.enableReview) {
          if ($(selectors.quickView).find(selectors.quickViewReview).length) {
            return window.SPR.registerCallbacks(), window.SPR.initRatingHandler(), window.SPR.initDomEls(), window.SPR.loadProducts(), window.SPR.loadBadges();
          };
        }
      },
  
      qvAddToCart: function(){
        if (vela.settings.cartType != "page"){
            ajaxCart.init({
                formSelector: '.formQuickview',
                cartContainer: '[data-cart-container]',
                addToCartSelector: 'button[type="submit"]',
                cartCountSelector: '[data-cart-count]',
                cartCostSelector: '[data-cart-cost]',
                moneyFormat: vela.strings.moneyFormat
            });
        }
      },
  
      getCurrentOptions: function() {
        var currentOptions = _.map(
          $(selectors.quickviewVariant, selectors.quickViewContainer), function(element) {
            var $element = $(element);
            var type = $element.attr('type');
            var currentOption = {};
            if (type === 'radio' || type === 'checkbox') {
              if ($element[0].checked) {
                currentOption.value = $element.val();
                currentOption.index = $element.data('index');
                return currentOption;
              } else {
                return false;
              }
            } else {
              currentOption.value = $element.val();
              currentOption.index = $element.data('index');
              return currentOption;
            }
          }
        );
        currentOptions = _.compact(currentOptions);
        return currentOptions;
      },
  
      getVariantFromOptions: function() {
        var selectedValues = this.getCurrentOptions();
        var variants = this.productVariants;
        var found = _.find(variants, function(variant) {
          return selectedValues.every(function(values) {
            return _.isEqual(variant[values.index], values.value);
          });
        });
  
        return found;
      },
  
      updateVariantsButton: function () {
        var selectedValues = this.getCurrentOptions();
        var variants = this.productVariants;
  
        for (var i = 2; i <= 3; i++) {
          if ($('[data-quickview-variant-option="' + i + '"]', selectors.quickViewContainer).length) {
            $('[data-quickview-variant-option="' + i + '"] ' + selectors.quickviewVariant, selectors.quickViewContainer).each(function() {
              var $self = $(this);
              var optionValue = $self.val();
              var foundIndex;
              if (i === 2) {
                foundIndex = _.findIndex(variants, function(variant) {
                  return variant.option1 === selectedValues[0].value &&
                    variant.option2 === optionValue &&
                    variant.available === true;
                });
              } else if (i === 3) {
                foundIndex = _.findIndex(variants, function(variant) {
                  return variant.option1 === selectedValues[0].value &&
                  variant.option2 === selectedValues[1].value &&
                    variant.option3 === optionValue &&
                    variant.available === true;
                });
              }
              if (foundIndex !== -1) {
                $self.removeAttr('disabled', 'disabled').removeClass('disabled');
                $self.next('label').removeClass('disabled');
              } else {
                $self.attr('disabled', 'disabled').addClass('disabled');
                $self.next('label').addClass('disabled');
              }
            });
          }
        }
      },
  
      updateVariantsButtonDisabed: function() {
        for (var i = 2; i <= 3; i++) {
          if ($('[data-quickview-variant-option="' + i + '"]', selectors.quickViewContainer).length) {
            var isUpdate = false;
            $('[data-quickview-variant-option="' + i + '"] ' + selectors.quickviewVariant, selectors.quickViewContainer).each(function() {
              var $element = $(this);
              var type = $element.attr('type');
              if (type === 'radio' || type === 'checkbox') {
                if (this.checked && $element.hasClass('disabled')) {
                  $element.prop('checked', false);
                  isUpdate = true;
                  return false;
                }
              }
            });
            $('[data-quickview-variant-option="' + i + '"] ' + selectors.quickviewVariant, selectors.quickViewContainer).each(function() {
              var $element = $(this);
              var type = $element.attr('type');
              if (isUpdate && (type === 'radio' || type === 'checkbox') && !$element.hasClass('disabled')) {
                $element.prop('checked', true);
                isUpdate = false;
                $element.trigger('change');
                return false;
              }
            });
          }
        }
      },
  
      updateMasterSelect: function(variant) {
        if (variant) {
          $(selectors.originalSelectorId, selectors.quickViewContainer).val(variant.id);
        }
      },
  
      updateMedia: function(variant) {
        if (variant && variant.featured_media && variant.featured_media.id) {
          $(selectors.quickViewImages, selectors.quickViewContainer).find('.quickview-images__item').each(function() {
            var imageID = $(this).data('media-id');
            if (variant.featured_media.id == imageID) {
              var slickIndex = $(this).closest('.slick-carousel__item').data('slick-index');
              if (slickIndex !== undefined && slickIndex !== null) {
                $(selectors.quickViewImages, selectors.quickViewContainer).slick('slickGoTo', slickIndex);
              }
            }
          });
        }
      },
  
      updatePrice: function(variant) {
        var moneyFormat = vela.strings.moneyFormat;
        if (!variant) {
          $(selectors.quickViewProductPrice, selectors.quickViewContainer).addClass('d-none');
          $(selectors.quickViewProductPriceCompare, selectors.quickViewContainer).addClass('d-none');
        } else {
          $(selectors.quickViewProductPrice, selectors.quickViewContainer).removeClass('d-none');
          $(selectors.quickViewProductPriceCompare, selectors.quickViewContainer).removeClass('d-none');
          $(selectors.quickViewProductPrice, selectors.quickViewContainer).html(
            vela.Currency.formatMoney(variant.price, moneyFormat)
          );
          if (variant.compare_at_price > variant.price) {
            $(selectors.quickViewProductPriceCompare, selectors.quickViewContainer).html(
              vela.Currency.formatMoney(variant.compare_at_price, moneyFormat)
            ).removeClass('d-none');
            $(selectors.quickViewProductPrice, selectors.quickViewContainer).addClass('on-sale');
          } else {
            $(selectors.quickViewProductPriceCompare, selectors.quickViewContainer).addClass('d-none');
            $(selectors.quickViewProductPrice, selectors.quickViewContainer).removeClass('on-sale');
          }
        }
      },
  
      updateSKU: function(variant) {
        var sku = variant && variant.sku !== null && variant.sku !== '' ? variant.sku : 'N/A';
        $(selectors.quickViewSKU, selectors.quickViewContainer).html(sku);
      },
  
      updateProductAvaiable: function(variant) {
        var classActive = 'product-avaiable--active';
        var translations = vela.strings;
        
        $(selectors.quickViewAvaiable, selectors.quickViewContainer).removeClass(classActive);
        if(preOrder) {
          $(selectors.quickViewAvaiableInStockText, selectors.quickViewContainer).addClass('text-info').html(translations.preOrder);
        }
        if (variant) {
          if (variant.available) {
            $(selectors.quickViewQty, selectors.quickViewContainer).removeClass('d-none');
            $(selectors.quickViewAvaiableInStock, selectors.quickViewContainer).addClass(classActive);
          } else {
            $(selectors.quickViewQty, selectors.quickViewContainer).addClass('d-none');
            $(selectors.quickViewAvaiableOutStock, selectors.quickViewContainer).addClass(classActive);
          }
  
          // Button add to cart
          if (variant.available) {
            $(selectors.quickViewContainer).find('.btn--add-to-cart').removeClass('disabled').prop('disabled', false);
            if ( preOrder ) {
              $(selectors.quickViewContainer).find('.btn--add-to-cart .btn__text').html(translations.preOrder);
            } else {
              $(selectors.quickViewContainer).find('.btn--add-to-cart .btn__text').html(translations.addToCart);
            }
          } else {
            $(selectors.quickViewContainer).find('.btn--add-to-cart')
              .addClass('disabled')
              .prop('disabled', true);
            $(selectors.quickViewContainer).find('.btn--add-to-cart .btn__text').html(translations.soldOut);
          }
        } else {
          $(selectors.quickViewQty, selectors.quickViewContainer).addClass('d-none');
          $(selectors.quickViewContainer).find('.btn--add-to-cart')
            .addClass('disabled')
            .prop('disabled', true);
          $(selectors.quickViewContainer).find('.btn--add-to-cart .btn__text').html(translations.unavailable);
        }
      },
  
      updateDetailsLink: function(variant) {
        if (variant) {
          var productURL = $(selectors.quickViewProductDetailsURL, selectors.quickViewContainer).data('url') + '?variant=' + variant.id;
          $(selectors.quickViewProductDetailsURL, selectors.quickViewContainer).removeClass('d-none').attr('href', productURL);
        } else {
          $(selectors.quickViewProductDetailsURL, selectors.quickViewContainer).addClass('d-none');
        }
      },
      
      updateToolTip: function() {
        $('[data-qv-toggle="tooltip"]', selectors.quickViewContainer).tooltip();
      },
  
      onVariantChange: function() {
        var variant = this.getVariantFromOptions();
        if ($('[data-single-option-button]', selectors.quickViewContainer).length) {
          this.updateVariantsButton();
          if (!variant || !variant.available) {
            this.updateVariantsButtonDisabed();
            return;
          }
        }
        this.updateMasterSelect(variant);
        this.updateMedia(variant);
        this.updatePrice(variant);
        this.updateSKU(variant);
        this.updateProductAvaiable(variant);
        this.updateDetailsLink(variant);
        this.currentVariant = variant;
      },
  
      show: function() {
        $(selectors.body).addClass('quickview-active');
        $(selectors.quickView).addClass('show');
      },
  
      hide: function() {
        $(selectors.quickViewContainer).html();
        $(selectors.body).removeClass('quickview-active');
        $(selectors.quickView).removeClass('show');
      }
    });
  
    return QuickView;
  })();