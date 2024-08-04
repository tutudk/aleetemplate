window.vela = window.vela || {};
vela.Sections = function Sections() {
  this.constructors = {};
  this.instances = [];

  $(document)
    .on('shopify:section:load', this._onSectionLoad.bind(this))
    .on('shopify:section:unload', this._onSectionUnload.bind(this))
    .on('shopify:section:select', this._onSelect.bind(this))
    .on('shopify:section:deselect', this._onDeselect.bind(this))
    .on('shopify:block:select', this._onBlockSelect.bind(this))
    .on('shopify:block:deselect', this._onBlockDeselect.bind(this));
};

vela.Sections.prototype = _.assignIn({}, vela.Sections.prototype, {
  _createInstance: function(container, constructor) {
    var $container = $(container);
    var id = $container.attr('data-section-id');
    var type = $container.attr('data-section-type');
    constructor = constructor || this.constructors[type];
    if (_.isUndefined(constructor)) {
      return;
    }
    var instance = _.assignIn(new constructor(container), {
      id: id,
      type: type,
      container: container
    });
    this.instances.push(instance);
  },

  _onSectionLoad: function(evt) {
    var container = $('[data-section-id]', evt.target)[0];
    if (container) {
      this._createInstance(container);
    }
  },

  _onSectionUnload: function(evt) {
    this.instances = _.filter(this.instances, function(instance) {
      var isEventInstance = instance.id === evt.originalEvent.detail.sectionId;
      if (isEventInstance) {
        if (_.isFunction(instance.onUnload)) {
          instance.onUnload(evt);
        }
      }
      return !isEventInstance;
    });
  },

  _onSelect: function(evt) {
    var instance = _.find(this.instances, function(instance) {
      return instance.id === evt.originalEvent.detail.sectionId;
    });
    if (!_.isUndefined(instance) && _.isFunction(instance.onSelect)) {
      instance.onSelect(evt);
    }
  },

  _onDeselect: function(evt) {
    var instance = _.find(this.instances, function(instance) {
      return instance.id === evt.originalEvent.detail.sectionId;
    });
    if (!_.isUndefined(instance) && _.isFunction(instance.onDeselect)) {
      instance.onDeselect(evt);
    }
  },

  _onBlockSelect: function(evt) {
    var instance = _.find(this.instances, function(instance) {
      return instance.id === evt.originalEvent.detail.sectionId;
    });
    if (!_.isUndefined(instance) && _.isFunction(instance.onBlockSelect)) {
      instance.onBlockSelect(evt);
    }
  },

  _onBlockDeselect: function(evt) {
    var instance = _.find(this.instances, function(instance) {
      return instance.id === evt.originalEvent.detail.sectionId;
    });
    if (!_.isUndefined(instance) && _.isFunction(instance.onBlockDeselect)) {
      instance.onBlockDeselect(evt);
    }
  },

  register: function(type, constructor) {
    this.constructors[type] = constructor;
    $('[data-section-type=' + type + ']').each(
      function(index, container) {
        this._createInstance(container, constructor);
      }.bind(this)
    );
  }
});
vela.Disclosure = (function() {
  var selectors = {
    disclosureInput: '[data-disclosure-input]',
    disclosureOptions: '[data-disclosure-option]'
  };

  function Disclosure($disclosure) {
    this.$container = $disclosure;
    this.cache = {};
    this._cacheSelectors();
    this._connectOptions();
  }

  Disclosure.prototype = _.assignIn({}, Disclosure.prototype, {
    _cacheSelectors: function() {
      this.cache = {
        $disclosureInput: this.$container.find(selectors.disclosureInput),
        $disclosureOptions: this.$container.find(selectors.disclosureOptions)
      };
    },

    _connectOptions: function() {
      this.cache.$disclosureOptions.on(
        'click',
        function(evt) {
          evt.preventDefault();
          this._submitForm($(evt.currentTarget).data('value'));
        }.bind(this)
      );
    },

    _submitForm: function(value) {
      this.cache.$disclosureInput.val(value);
      this.$container.parents('form').submit();
    },

    unload: function() {
      this.cache.$disclosureOptions.off();
      this.$container.off();
    }
  });

  return Disclosure;
})();
vela.Currency = (function() {
  var moneyFormat = '${{amount}}';
  function formatMoney(cents, format) {
    if (typeof cents === 'string') {
      cents = cents.replace('.', '');
    }
    var value = '';
    var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    var formatString = format || moneyFormat;

    function formatWithDelimiters(number, precision, thousands, decimal) {
      thousands = thousands || ',';
      decimal = decimal || '.';
      if (isNaN(number) || number === null) {
        return 0;
      }
      number = (number / 100.0).toFixed(precision);
      var parts = number.split('.');
      var dollarsAmount = parts[0].replace(
        /(\d)(?=(\d\d\d)+(?!\d))/g,
        '$1' + thousands
      );
      var centsAmount = parts[1] ? decimal + parts[1] : '';
      return dollarsAmount + centsAmount;
    }

    switch (formatString.match(placeholderRegex)[1]) {
      case 'amount':
        value = formatWithDelimiters(cents, 2);
        break;
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
      case 'amount_no_decimals_with_space_separator':
        value = formatWithDelimiters(cents, 0, ' ');
        break;
      case 'amount_with_apostrophe_separator':
        value = formatWithDelimiters(cents, 2, "'");
        break;
    }
    return formatString.replace(placeholderRegex, value);
  }
  return {
    formatMoney: formatMoney
  };
})();

if (typeof ShopifyAPI === 'undefined') {
  ShopifyAPI = {};
}
ShopifyAPI.attributeToString = function(attribute) {
  if (typeof attribute !== 'string') {
    attribute += '';
    if (attribute === 'undefined') {
      attribute = '';
    }
  }
  return jQuery.trim(attribute);
}

ShopifyAPI.onCartUpdate = function() {
  // When cart update
};

ShopifyAPI.updateCartNote = function(note, callback) {
  var params = {
    type: 'POST',
    url: '/cart/update.js',
    data: 'note=' + ShopifyAPI.attributeToString(note),
    dataType: 'json',
    success: function(cart) {
      if (typeof callback === 'function') {
        callback(cart);
      } else {
        ShopifyAPI.onCartUpdate(cart);
      }
    },
    error: function(XMLHttpRequest, textStatus) {
      ShopifyAPI.onError(XMLHttpRequest, textStatus);
    }
  };
  jQuery.ajax(params);
};

ShopifyAPI.onError = function(XMLHttpRequest) {
  var data = eval('(' + XMLHttpRequest.responseText + ')');
  if (data.message) {
    alert(data.message + '(' + data.status + '): ' + data.description);
  }
};

ShopifyAPI.addItemFromForm = function(form, callback, errorCallback) {
  var formData = new FormData(form);
  var params = {
    type: 'POST',
    url: '/cart/add.js',
    data: formData,
    processData: false,
    contentType: false,
    dataType: 'json',
    success: function(line_item) {
      if (typeof callback === 'function') {
        callback(line_item, form);
      } else {
        ShopifyAPI.onItemAdded(line_item, form);
      }
    },
    error: function(XMLHttpRequest, textStatus) {
      if (typeof errorCallback === 'function') {
        errorCallback(XMLHttpRequest, textStatus);
      } else {
        ShopifyAPI.onError(XMLHttpRequest, textStatus);
      }
    }
  };
  jQuery.ajax(params);
};

ShopifyAPI.getCart = function(callback, added) {
  jQuery.getJSON('/cart.js', function(cart) {
    if (typeof callback === 'function') {
      callback(cart, added);
    } else {
      ShopifyAPI.onCartUpdate(cart);
    }
  });
};

ShopifyAPI.changeItem = function(line, quantity, callback) {
  var params = {
    type: 'POST',
    url: '/cart/change.js',
    data: 'quantity=' + quantity + '&line=' + line,
    dataType: 'json',
    success: function(cart) {
      if (typeof callback === 'function') {
        callback(cart);
      } else {
        ShopifyAPI.onCartUpdate(cart);
      }
    },
    error: function(XMLHttpRequest, textStatus) {
      ShopifyAPI.onError(XMLHttpRequest, textStatus);
    }
  };
  jQuery.ajax(params);
};

var ajaxCart = (function(module, $) {
  'use strict';

  // Public functions
  var init, loadCart;

  // Private general variables
  var settings, isUpdating, $body;

  // Private plugin variables
  var $formContainer,
    $addToCart,
    $cartCountSelector,
    $cartCostSelector,
    $cartContainer;

  // Private functions
  var initializeEvents,
    updateCountPrice,
    formOverride,
    itemAddedCallback,
    itemErrorCallback,
    cartModalAdded,
    cartUpdateCallback,
    buildCart,
    cartCallback,
    shippingBar,
    adjustCart,
    adjustCartCallback,
    validateQty;

  /*============================================================================
    Initialise the plugin and define global options
 ==============================================================================*/
  init = function(options) {
    // Default settings
    settings = {
      formSelector: '[data-product-form]',
      cartContainer: '[data-cart-container]',
      addToCartSelector: 'button[type="submit"]',
      cartCountSelector: '[data-cart-count]',
      cartCostSelector: '[data-cart-cost]',
      cartRemoveSelector: '[data-cart-remove]',
      headerCartSelector: '.js-header-cart',
      cartModalSelector: '.js-cart-modal',
      cartModalCloseSelector: '.js-cart-modal-close',
      moneyFormat: vela.strings.moneyFormat,
      disableAjaxCart: false,
      cartTemplate: '#ajaxcart-template',
      cartModalHeaderTemplate: '#ajaxcart-header-template'
    };

    // Override defaults with arguments
    $.extend(settings, options);

    // Select DOM elements
    $formContainer = $(settings.formSelector);
    $cartContainer = $(settings.cartContainer);
    $addToCart = $formContainer.find(settings.addToCartSelector);
    $cartCountSelector = $(settings.cartCountSelector);
    $cartCostSelector = $(settings.cartCostSelector);

    $body = $('body');
    isUpdating = false;
    initializeEvents();
    if (!settings.disableAjaxCart) {
      formOverride();
    }
    adjustCart();
  };

  initializeEvents = function() {
    $body.on('click', settings.cartModalCloseSelector, function() {
      $(settings.cartModalSelector).fadeOut(400, function() {
        $(this).remove();
      });
    });

    $body.on('click', settings.headerCartSelector, function(e) {
      if (vela.settings.cartType == 'modal' && $(window).width() > 767 && !$('body').hasClass('template-cart')) {
        e.preventDefault();
        return;
      }
    });

    $body.on('click', settings.cartRemoveSelector, function(e) {
      if (isUpdating) {
        return;
      }
      var $el = $(this),
        line = $el.data('line');
      if (line) {
        isUpdating = true;
        setTimeout(function() {
          ShopifyAPI.changeItem(line, 0, adjustCartCallback);
        }, 250);
      }
    });

    $body.on('change', '.ajaxcart__note-input', function() {
      var newNote = $(this).val();
      ShopifyAPI.updateCartNote(newNote, function() {});
    });
    $body.on('change', '.coupon_code_input', function() {
			var newDiscount = $(this).val();
			vela.setCookie('vela_discount', newDiscount, 1);
		});
  };

  loadCart = function() {
    if($('.js-drawer').length > 0 || $('[data-cart-container]').length > 0 ) {
			$body.addClass('ajaxcart--is-loading');
		}
    ShopifyAPI.getCart(cartUpdateCallback);
  };

  updateCountPrice = function(cart) {
    if ($cartCountSelector) {
      $cartCountSelector.html(cart.item_count);
    }
    if ($cartCostSelector) {
      $cartCostSelector.html(
        vela.Currency.formatMoney(cart.total_price, vela.strings.moneyFormat)
      );
    }
  };

  formOverride = function() {
    $body.on('submit', settings.formSelector, function(evt) {
      evt.preventDefault();
       $addToCart.attr('disabled', 'disabled').prepend('<span class="spinner-border spinner-border-sm"></span>');
        $addToCart.removeClass('is-added').addClass('is-adding');
      $('.ajaxcart-toast').toast('hide');
			ShopifyAPI.addItemFromForm(evt.target,itemAddedCallback,itemErrorCallback);
    });
  };

  itemAddedCallback = function(lineItem) {
    $addToCart.removeAttr('disabled').find('.spinner-border').remove();
    $addToCart.removeClass('is-adding').addClass('is-added');
    if (vela.settings.cartType == 'modal') {
      cartModalAdded(lineItem);
    }
    ShopifyAPI.getCart(cartUpdateCallback, true);
  };

  itemErrorCallback = function(XMLHttpRequest) {
    var data = eval('(' + XMLHttpRequest.responseText + ')');
    $addToCart.removeAttr('disabled').find('.spinner-border').remove();
    $addToCart.removeClass('is-adding is-added');

    if (data.message) {
      if (data.status === 422) {
        var $toast = $('.ajaxcart-toast');
        $toast.find('.toast-body').html(data.description);
        $toast.toast('show');
      }
    }
  };

  cartModalAdded = function(lineItem) {
    var data = {},
      image = '//cdn.shopify.com/s/assets/admin/no-image-medium-cc9732cb976dd349a0df1d39816fbcc7.gif',
      source = $(settings.cartModalHeaderTemplate).html(),
      template = Handlebars.compile(source);
    if (lineItem.image != null) {
      image = lineItem.image;
    }
    data = {
      name: lineItem.title,
      image: image,
      options: lineItem.options_with_values
    }
    $body.append(template(data));
    $('.js-cart-modal').fadeIn(400);
  };

  cartUpdateCallback = function(cart, added) {
    updateCountPrice(cart);
    buildCart(cart);
    if (added) {
      $body.trigger('drawer.open');
    }
  };

  buildCart = function(cart) {
    $cartContainer.empty();
    if ( vela.settings.shippingBarEnable) {       
      shippingBar(cart);
    }
    // Show empty cart
    if (cart.item_count === 0) {
      $cartContainer.append(
        '<p class="cart-empty-message">' +
          vela.strings.cartEmpty +
          '</p>\n' +
          '<p class="cookie-message">' +
          vela.strings.cartCookies +
          '</p>'
      );

      cartCallback(cart);
      return;
    }
    var items = [],
      item = {},
      data = {},
      source = $(settings.cartTemplate).html();

    var template = Handlebars.compile(source);

    $.each(cart.items, function(index, cartItem) {
      var prodImg;
      var unitPrice = null;
      if (cartItem.image !== null) {
        prodImg = cartItem.image
          .replace(/(\.[^.]*)$/, '_small$1')
          .replace('http:', '');
      } else {
        prodImg =
          '//cdn.shopify.com/s/assets/admin/no-image-medium-cc9732cb976dd349a0df1d39816fbcc7.gif';
      }

      if (cartItem.properties !== null) {
        $.each(cartItem.properties, function(key, value) {
          if (key.charAt(0) === '_' || !value) {
            delete cartItem.properties[key];
          }
        });
      }

      if (cartItem.properties !== null) {
        $.each(cartItem.properties, function(key, value) {
          if (key.charAt(0) === '_' || !value) {
            delete cartItem.properties[key];
          }
        });
      }

      if (cartItem.line_level_discount_allocations.length !== 0) {
        for (var discount in cartItem.line_level_discount_allocations) {
          var amount =
            cartItem.line_level_discount_allocations[discount].amount;

          cartItem.line_level_discount_allocations[
            discount
          ].formattedAmount = vela.Currency.formatMoney(
            amount,
            vela.strings.moneyFormat
          );
        }
      }

      if (cart.cart_level_discount_applications.length !== 0) {
        for (var cartDiscount in cart.cart_level_discount_applications) {
          var cartAmount =
            cart.cart_level_discount_applications[cartDiscount]
              .total_allocated_amount;

          cart.cart_level_discount_applications[
            cartDiscount
          ].formattedAmount = vela.Currency.formatMoney(
            cartAmount,
            vela.strings.moneyFormat
          );
        }
      }

      if (cartItem.unit_price_measurement) {
        unitPrice = {
          addRefererenceValue:
            cartItem.unit_price_measurement.reference_value !== 1,
          price: vela.Currency.formatMoney(
            cartItem.unit_price,
            vela.strings.moneyFormat
          ),
          reference_value: cartItem.unit_price_measurement.reference_value,
          reference_unit: cartItem.unit_price_measurement.reference_unit
        };
      }

      // Create item's data object and add to 'items' array
      item = {
        key: cartItem.key,
        line: index + 1, // Shopify uses a 1+ index in the API
        url: cartItem.url,
        img: prodImg,
        name: cartItem.product_title,
        prodHandle: cartItem.handle,
        variation: cartItem.variant_title === null ? false : true,
        variant: cartItem.variant,
		    options: cartItem.options_with_values,
		    variant_id: cartItem.variant_id,
        properties: cartItem.properties,
        itemAdd: cartItem.quantity + 1,
        itemMinus: cartItem.quantity - 1,
        itemQty: cartItem.quantity,
        price: vela.Currency.formatMoney(
          cartItem.original_line_price,
          vela.strings.moneyFormat
        ),
        discountedPrice: vela.Currency.formatMoney(
          cartItem.final_line_price,
          vela.strings.moneyFormat
        ),
        discounts: cartItem.line_level_discount_allocations,
        discountsApplied:cartItem.line_level_discount_allocations.length === 0 ? false : true,
        vendor: cartItem.vendor,
        unitPrice: unitPrice
      };

      items.push(item);
    });

    // Gather all cart data and add to DOM
    data = {
      items: items,
      note: cart.note,
      totalPrice: vela.Currency.formatMoney(
        cart.total_price,
        vela.strings.moneyFormat
      ),
      cartDiscounts: cart.cart_level_discount_applications,
      cartDiscountsApplied:
        cart.cart_level_discount_applications.length === 0 ? false : true
    };
    $cartContainer.append(template(data));
    cartCallback(cart);
    var discount_code = vela.getCookie('vela_discount');
    if( discount_code ) {
      $(".js-drawer .coupon_code_input").val(discount_code);
    }
    var gift_proHandle = $(".ajaxcart__gift--button").data("prohandle");
    $.each(data.items, function() {
      $.each(this, function( index , value) {
        if(( index == "prodHandle" && value == gift_proHandle )) {
          $(".ajaxcart__gift--button").addClass("d-none");
        }
      });
    });
    
    $('.pre_order-cart >span').each(function(){
      var preOrder_prohandle = $(this).data('handle');
      $.each(data.items, function( index , value) {
        if(value.prodHandle == preOrder_prohandle ) {
          $('.ajaxcart__product[data-line="'+ value.line + '"] .pro_preorder').removeClass('d-none');
        }
      });
     
    });
  };
  shippingBar = function(cart) {  
    var shipping_value = $('.shipping-bar-cart').data('shipping_value');
    if( (shipping_value > cart.total_price) && shipping_value != 0){
      var minus_spend = shipping_value - cart.total_price;
      var spend = vela.Currency.formatMoney(minus_spend,settings.moneyFormat);
      var percent	= cart.total_price/shipping_value*100;
      $('.shipping-bar-cart .title-spend .spend').html(spend);
      $('.shipping-bar-cart .progress-bar').css("width",percent+"%");
      if (cart.item_count === 0) {
        $('.shipping-bar-cart').removeClass('shipping-progress');
        $('.shipping-bar-cart').removeClass('shipping-free');
      } else {
        $('.shipping-bar-cart').removeClass('shipping-free');
        $('.shipping-bar-cart').addClass('shipping-progress');
      }
    }else {
      $('.shipping-bar-cart').addClass('shipping-free');
      $('.shipping-bar-cart').addClass('effect');
      $('.shipping-bar-cart').removeClass('shipping-progress');
      $('.shipping-bar-cart .progress-bar').css("width","100%");
      setTimeout(function() {
        $('.shipping-bar-cart').removeClass('effect');
      },5000);
    }
  };
  cartCallback = function(cart) {
    $body.removeClass('ajaxcart--is-loading');
    $body.trigger("ajaxCart.afterCartLoad", cart);
    if (window.Shopify && Shopify.StorefrontExpressButtons) {
      Shopify.StorefrontExpressButtons.initialize();
    }
    $body.trigger('drawer.footer');
  };

  adjustCart = function() {
    $body.on('click', '.ajaxcart__qty-adjust', function() {
      if (isUpdating) {
        return;
      }
      var $el = $(this),
        line = $el.data('line'),
        $qtySelector = $el.siblings('.ajaxcart__qty-num'),
        qty = parseInt($qtySelector.val().replace(/\D/g, ''));

      qty = validateQty(qty);

      if ($el.hasClass('ajaxcart__qty--plus')) {
        qty += 1;
      } else {
        qty -= 1;
        if (qty <= 0) qty = 0;
      }

      if (line) {
        updateQuantity(line, qty);
      } else {
        $qtySelector.val(qty);
      }
    });

    $body.on('change', '.ajaxcart__qty-num', function() {
      if (isUpdating) {
        return;
      }
      var $el = $(this),
        line = $el.data('line'),
        qty = parseInt($el.val().replace(/\D/g, ''));

      qty = validateQty(qty);

      if (line) {
        updateQuantity(line, qty);
      }
    });

    $body.on('submit', 'form.ajaxcart', function(evt) {
      if (isUpdating) {
        evt.preventDefault();
      }
    });

    $body.on('focus', '.ajaxcart__qty-adjust', function() {
      var $el = $(this);
      setTimeout(function() {
        $el.select();
      }, 50);
    });

    function updateQuantity(line, qty) {
      isUpdating = true;

      var $row = $('.ajaxcart__product[data-line="' + line + '"]').addClass(
        'is-loading'
      );

      if (qty === 0) {
        $row.parent().addClass('is-removed');
      }

      setTimeout(function() {
        ShopifyAPI.changeItem(line, qty, adjustCartCallback);
      }, 250);
    }
  };

  adjustCartCallback = function(cart) {
    updateCountPrice(cart);
    setTimeout(function() {
      ShopifyAPI.getCart(buildCart);
      isUpdating = false;
    }, 150);
  };

  validateQty = function(qty) {
    if (parseFloat(qty) === parseInt(qty) && !isNaN(qty)) {
      // We have a valid number!
    } else {
      qty = 1;
    }
    return qty;
  };
  
  module = {
    init: init,
    load: loadCart
  };

  return module;

})(ajaxCart || {}, jQuery);

vela.drawerCart = (function(module) {
  var $body, $drawer, drawerCloseSelector, headerCartSelector, drawerIsOpen;

  var init, drawerOpen, drawerClose, drawerFooter;

  var classes = {
    open: 'drawer--open'
  };

  init = function() {
    $body = $('body');
    $drawer = $('.js-drawer');
    drawerCloseSelector = '.js-drawer-close';
    headerCartSelector = '.js-header-cart';
    drawerIsOpen = false;

    $body.on('drawer.open', function(evt) {
      drawerOpen(evt);
    });

    $body.on('drawer.close', function(evt) {
      drawerClose(evt);
    });

    $body.on('drawer.footer', function() {
      drawerFooter();
    });

    $body.on('click', headerCartSelector, function(evt) {
      evt.preventDefault();
      $body.trigger('drawer.open', evt);
    });

    $body.on('click', drawerCloseSelector, function(evt) {
      evt.preventDefault();
      $body.trigger('drawer.close', evt);
    });
  };

  drawerOpen = function(evt) {
    if (drawerIsOpen) {
      if (evt) {
        evt.preventDefault();
      }
      return;
    }

    if (evt) {
      evt.preventDefault();
    }

    $body.addClass(classes.open);
    drawerIsOpen = true;
  };

  drawerClose = function(evt) {
    if (!drawerIsOpen) {
      return;
    }

    if (evt.keyCode !== 27) {
      evt.preventDefault();
    }

    $body.removeClass(classes.open);
    drawerIsOpen = false;
  };

  drawerFooter = function() {
    if (!$drawer.hasClass('drawer--has-fixed-footer')) {
      return;
    }
    var $cartFooter = $('.ajaxcart__footer').removeAttr('style');
    var $cartInner = $('.ajaxcart__inner').removeAttr('style');
    var cartFooterHeight = $cartFooter.outerHeight();
    $('.drawer__inner').css('top', ( $('.drawer__header').outerHeight() + 15));
    $cartInner.css('bottom', cartFooterHeight);
    $cartFooter.css('height', cartFooterHeight);
    if(vela.settings.shippingCalcEnable && $cartFooter.hasClass('border-top')) {
      Shopify.Cart.ShippingCalculator.show( {
        submitButton: vela.settings.shippingCalcSubmitButton,
        submitButtonDisabled: vela.settings.shippingCalcSubmitButtonDisabled,
        customerIsLoggedIn: vela.settings.shippingCalcCustomerIsLoggedIn,
        moneyFormat: vela.strings.shop_money_with_currency_format
      });
    }
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl)
    });
  };

  module = {
    init: init
  }

  return module;
})();

vela.variables = {
  productPageLoad: false,
  productPageSticky: true,
  mediaTablet: 'screen and (max-width: 1024px)',
  mediaMobile: 'screen and (max-width: 767px)',
  isTablet: false,
  isMobile: false
};

vela.initializeEvents = function() {
  var $body = $('body'),
    passwordToggle = '.js-password-toggle',
    scrollToTop = '.js-scroll-to-top',
    collectionSidebarToggle = '.js-sidebar-toggle';
  var classes = {
    passwordShow: 'password-toggle--show'
  };
  $body.on('click', passwordToggle, function(e) {
    e.preventDefault();
    var $this = $(this);
    var $passwordField = $this.siblings('.form-control');
    var isShow = $this.hasClass(classes.passwordShow) ? true : false;
    if (isShow) {
      $this.removeClass(classes.passwordShow);
      $passwordField.attr('type', 'password');
    } else {
      $this.addClass(classes.passwordShow);
      $passwordField.attr('type', 'text');
    }
  });

  $body.on('click', scrollToTop, function(e) {
    e.preventDefault();
    $('body, html').stop().animate({ scrollTop: 0 }, '500');
  });

  $body.on('click', collectionSidebarToggle,function(evt) {
    evt.preventDefault();
    $body.toggleClass('collection-sidebar--open');
  });

  $(window).scroll(function() {
    if ($(window).scrollTop() >= 200) {
      $(scrollToTop).fadeIn();
    } else {
      $(scrollToTop).fadeOut();
    }
  });
};

vela.setBreakpoints = function() {
  enquire.register(vela.variables.mediaTablet, {
    match: function() {
      vela.variables.isTablet = true;
    },
    unmatch: function() {
      vela.variables.isTablet = false;
    }
  });
  enquire.register(vela.variables.mediaMobile, {
    match: function() {
      vela.variables.isMobile = true;
    },
    unmatch: function() {
      vela.variables.isMobile = false;
    }
  });
};

vela.updateSlickSwipe = function(element, allowSwipe){
  if (!element.hasClass('slick-initialized')) {
    return;
  }
  var slickOptions = {
    accessibility: allowSwipe,
    draggable: allowSwipe,
    swipe: allowSwipe,
    touchMove: allowSwipe
  };
  element.slick('slickSetOption', slickOptions, false);
};

vela.showLoading = function () {
  $('body').append(vela.loading != undefined && vela.loading != '' ? vela.loading : '');
};

vela.hideLoading = function() {
  $('.vela-loading').remove();
};

vela.cartInit = function() {
  var $body = $('body');
  if (!vela.cookiesEnabled()) {
    $body.addClass('cart--no-cookies');
  }
  if (vela.settings.cartType == 'modal' || vela.settings.cartType == 'drawer') {
    ajaxCart.init();
    ajaxCart.load();

    if (vela.settings.cartType == 'drawer') {
      vela.drawerCart.init();
    }
  }
};

vela.cookiesEnabled = function() {
  var cookieEnabled = navigator.cookieEnabled;

  if (!cookieEnabled){
    document.cookie = 'webcookie';
    cookieEnabled = (document.cookie.indexOf('webcookie') !== -1);
  }
  return cookieEnabled;
};

vela.setCookie = function(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
  var expires = 'expires=' + d.toGMTString();
  document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/';
};

vela.getCookie = function(cname) {
  var name = cname + '=';
  var decodedCookie = decodeURIComponent(document.cookie);
  var cookieArray = decodedCookie.split(';');
  for(var i = 0; i < cookieArray.length; i++) {
    var cookieItem = cookieArray[i];
    while (cookieItem.charAt(0) === ' ') {
      cookieItem = cookieItem.substring(1);
    }
    if (cookieItem.indexOf(name) === 0) {
      return cookieItem.substring(name.length, cookieItem.length);
    }
  }
  return '';
};

vela.cookieConsent = function() {
  var cConsent = vela.getCookie('cookie_consent'),
    cConsentSelector = $('.cookie-consent'),
    cConsentDismiss = '.cookie-consent-dismiss';
  if (cConsent == 'true') {
    cConsentSelector.remove();
  } else {
    setTimeout(function() {
      cConsentSelector.addClass('active');
    }, 1500);
    if (cConsent == '') vela.setCookie('cookie_consent', false, 365);
  }

  $('body').on('click', cConsentDismiss, function(e) {
    e.preventDefault();
    cConsentSelector.remove();
    vela.setCookie('cookie_consent', true, 365);
  });
};

vela.slideshow = function() {
  var slideshow = '.js-vela-slideshow',
    fade = $(slideshow).data('fade'),
    autoplay = $(slideshow).data('autoplay'),
    autoplayInterval = $(slideshow).data('autoplayinterval'),
    autoplayNavigation = $(slideshow).data('navigation'),
    autoplayPagination = $(slideshow).data('pagination');

  var config = {
    fade: true,
    rows: 0,
    arrows: autoplayNavigation,
    autoplay: autoplay,
    autoplaySpeed: autoplayInterval
  };

  (fade === undefined || fade == null) ? true : config.fade = fade;
  (autoplayInterval === undefined || autoplayInterval == null) ? true : config.autoplaySpeed = autoplayInterval;
  (autoplayPagination === undefined || autoplayPagination == null || autoplayPagination != true) ? config.dots = false : config.dots = true;

  $(slideshow).slick(config);
};

vela.slickCarousel = function() {
  var velCarousel = '.js-carousel';
  $(velCarousel).each(function() {
    var $element = $(this),
      nav = $element.data('nav'),
      dots = $element.data('dots'),
      center = $element.data('center'),
      infinite = $element.data('infinite'),
      autoplay = $element.data('autoplay'),
      autoplaySpeed = $element.data('autoplayspeed'),
      speedSlide = $element.data('speedslide'),
      columnone = $element.data('columnone'),
      columntwo = $element.data('columntwo'),
      columnthree = $element.data('columnthree'),
      columnfour = $element.data('columnfour'),
      rows = $element.data('rows');
    var config = {
      swipeToSlide: true,
      arrows: nav,
      slidesToShow: columnone,
      responsive: [
        {
          breakpoint: 992,
          settings: {
            slidesToShow: columntwo
          }
        },
        {
          breakpoint: 768,
          settings: {
            slidesToShow: columnthree
          }
        },
        {
          breakpoint: 576,
          settings: {
            slidesToShow: columnfour
          }
        }
      ]
    };
    (center === undefined || center == null || center != true) ? config.centerMode = false : config.centerMode = true;
    (dots === undefined || dots == null || dots != true) ? config.dots = false : config.dots = true;
    (infinite === undefined || infinite == null || infinite != true) ? config.infinite = false : config.infinite = true;
    (infinite === undefined || infinite == null || infinite != true) ? config.infinite = false : config.infinite = true;
    (speedSlide === undefined || speedSlide == null) ? config.speed = '300' : config.speed = speedSlide;
    if (autoplay) {
      config.autoplay = autoplay;
      config.autoplaySpeed = autoplaySpeed;
      config.cssEase = "linear";
    }
    if (rows !== undefined && rows != null && rows != 1) {
      config.rows = rows;
      config.slidesPerRow = columnone;
      config.slidesToShow = 1,
      config.responsive = [
        {
          breakpoint: 992,
          settings: {
            slidesPerRow: columntwo,
            slidesToShow: 1
          }
        },
        {
          breakpoint: 768,
          settings: {
            slidesPerRow: columnthree,
            slidesToShow: 1
          }
        },
        {
          breakpoint: 576,
          settings: {
            slidesPerRow: columnfour,
            slidesToShow: 1
          }
        }
      ]
    } else {
      config.rows = 0;
    }
    $element.slick(config);
  });

  $('.product-tabs__nav-link').on('shown.bs.tab', function() {
    var productTabs = $(this).closest('.product-tabs');
    if (productTabs.find(velCarousel).length > 0) {
      productTabs.find(velCarousel).slick('setPosition');
    }
  });
};

vela.countdown = function() {
  var countdown = '[data-countdown]';
  $(countdown).each(function() {
    var $this = $(this),
      finalDate = $(this).data('countdown');
    $this.countdown(finalDate, function(event) {
      var strTime = '<div class="countdown__item"><span>%D</span><span>' + vela.strings.countdownDays + '</span></div>' +
        '<div class="countdown__item"><span>%H</span><span>' + vela.strings.countdownHours + '</span></div>' +
        '<div class="countdown__item"><span>%M</span><span>' + vela.strings.countdownMinutes + '</span></div>' +
        '<div class="countdown__item"><span>%S</span><span>' + vela.strings.countdownSeconds + '</span></div>';
      $this.html(event.strftime(strTime));
    })
    .on('finish.countdown', function() {
      $this.html(vela.strings.countdownFinish);
    });
  });
};

vela.newsletter = function() {
  var alertNewsletter;
  $('.js-vela-newsletter').each(function() {
    var $form = $(this);
    $form.on('submit', function(event) {
      event.preventDefault();
      $('.js-alert-newsletter').remove();
      $.ajax({
        type: $form.attr('method'),
        url: $form.attr('action'),
        data: $form.serialize(),
        cache: false,
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        success: function(data) {
          if (data.result === 'success') {
            $form.prepend(alertNewsletter(vela.strings.newsletterSuccess ,'success'));
            $('.js-input-newsletter').val('');
          } else {
            $form.prepend(alertNewsletter(data.msg.replace('0 - ', '') ,'danger'));
          }
        },
        error: function(err) {
          $form.prepend(alertNewsletter(err ,'danger'));
        }
      });
    });
  });
  alertNewsletter = function(message, type) {
    var alert = '<div class="js-alert-newsletter alert-dismissible fade show alert alert--mailchimp alert-' + type + '">' + message + ' <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>';
    return alert;
  };
  var newsletterPopup = '.js-newsletter-popup',
    newsletterPopupClose = '.js-newsletter-popup-close',
    newsletterPopupSubmit = '.js-newsletter-popup-submit',
    cNewsletter = '',
    classNameNewsletterActive = 'newsletter-popup--active';
  if ($(newsletterPopup).find('.js-newsletter-popup-success').length > 0) {
    vela.setCookie('vela_newsletter_popup', 1, 30);
  }
  cNewsletter = vela.getCookie('vela_newsletter_popup');
  if (cNewsletter == 1) $(newsletterPopup).remove();

  if (cNewsletter != 1 && !($('.shopify-challenge__container').length > 0)) {
    setTimeout(function() {
      $(newsletterPopup).addClass(classNameNewsletterActive);
    }, 5000);
  }
  $(newsletterPopupClose).on('click', function() {
    if ($(newsletterPopup).find('.alert--mailchimp').length > 0) {
      vela.setCookie('vela_newsletter_popup', 1, 30);
    } else {
      vela.setCookie('vela_newsletter_popup', 1, 1);
    }
    $(newsletterPopup).removeClass(classNameNewsletterActive);
  });

  $(newsletterPopupSubmit).on('click', function() {
    vela.setCookie('vela_newsletter_popup', 1, 30);
  });
};
vela.swatchProduct = function() {
  $('.product-card__swatch--list .more_option').on( "click", function() {
    $(this).toggleClass('more_option_active');
    $('.product-card__swatch--list .extendlink').toggleClass('more_option_item');
  });
	$( ".product-card__swatch--list > li" ).click(function() {
    $(this).parent('.product-card__swatch--list').find('li').removeClass('is-active');
    $(this).addClass('is-active');
    var newImageSrc = $(this).find('.d-none img').attr('src');
    var newImageSrcset = $(this).find('.d-none img').attr('srcset');
    if (newImageSrc != 'undefined'){
        $(this).parents('.product-grid__inner').find('.product-card__img-primary img').attr({
            src: newImageSrc
        });
    }
    if (newImageSrcset != 'undefined'){
      $(this).parents('.product-grid__inner').find('.product-card__img-primary img').attr({
          srcset: newImageSrcset
      });
    }
    return false;
  });
}
vela.customNumberInput = function() {
  var $body = $('body'),
    qtyAdjust = '.js-qty-adjust',
    qtyNumber = '.js-qty-number';

  var validateQty;

  $body.on('click', qtyAdjust, function() {
    var $el = $(this),
      $qtySelector = $el.siblings(qtyNumber),
      qty = parseInt($qtySelector.val().replace(/\D/g, ''));

    qty = validateQty(qty);

    if ($el.hasClass('vela-qty__adjust--plus')) {
      qty += 1;
    } else {
      qty -= 1;
      if (qty <= 0) qty = 0;
      if (qty <= 0 && $qtySelector.attr('min') == '1') qty = 1;
    }

    $qtySelector.val(qty);
  });

  $body.on('focus', qtyAdjust, function() {
    var $el = $(this);
    setTimeout(function() {
      $el.select();
    }, 50);
  });

  validateQty = function(qty) {
    if (parseFloat(qty) === parseInt(qty) && !isNaN(qty)) {
      // We have a valid number!
    } else {
      qty = 1;
    }
    return qty;
  };
};

vela.preLoading = function() {
  if (vela.settings.enablePreLoading) {
    var counter = 0,
      preLoading = '#pre-loading',
      preLoadingBar = '.pre-loading__bar',
      items = new Array();

    $(preLoading).css({
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 99999,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(255, 255, 255, 1)'
    });

    function getImages(element) {
      $(element).find('*:not(script)').each(function() {
        var url = '';
        if ($(this).css('background-image') != '' &&
          $(this).css('background-image').indexOf('none') == -1 &&
          $(this).css('background-image').indexOf('-gradient') == -1) {
          url = $(this).css('background-image');
          if(url.indexOf('url') != -1) {
            var temp = url.match(/url\((.*?)\)/);
            url = temp[1].replace(/\"/g, '');
          }
        } else if ($(this).get(0).nodeName.toLowerCase() == 'img' && typeof($(this).attr('src')) != 'undefined') {
          url = $(this).attr('src');
        }

        if (url.length > 0 && items.length < 1) {
          items.push(url);
        }
      });
    }

    function runPreLoading() {
      counter++;
      var per = Math.round((counter / items.length) * 100);
      $(preLoadingBar).stop().animate({
          width: per + '%'
      }, 200, 'linear');
      if(counter >= items.length) {
        counter = items.length;
        $(preLoadingBar).stop().animate({
          width: '100%'
        }, 200, 'linear', function() {
          $(preLoading).fadeOut(200, function() {
            $(preLoading).remove();
          });
        }); 
      }
    }

    function preLoadingImage(url) {
      var imgPreLoading = new Image();
      $(imgPreLoading).on('load', function() {
        runPreLoading();
      }).on('error', function() {
        runPreLoading();
      }).attr('src', url);
    }

    function preLoadingStart() {
      if(items.length > 0 ){
        for (var i = 0; i < items.length; i++) {
          preLoadingImage(items[i]);
        }
      } else  {
        $(preLoadingBar).stop().animate({
          width: '100%'
        }, 200, 'linear', function() {
          $(preLoading).fadeOut(200, function() {
            $(preLoading).remove();
          });
        }); 
      }
    }
    getImages('body');
    preLoadingStart();
  }
};
vela.productLoadMore = function () {
  function loadmoreExecute() {
      var velaLoadNode = $('.sectioin-product-more .product-more__btn');
      var velaLoadUrl = $('.sectioin-product-more .product-more__btn').attr("href");
      $.ajax({
          type: 'GET',
          url: velaLoadUrl,
          beforeSend: function() {
            $('.sectioin-product-more .pre-loading').removeClass('d-none');
          },
          success: function(data) {
              velaLoadNode.remove();
              var filteredData = $(data).find(".product-more__content");
              filteredData.insertBefore($(".product-more__bottom"));
              btnMoreEvent();
              updateToolTip();
              ajaxFilterReview();
          },
          dataType: "html"
      });
  }
  function btnMoreEvent(){
      $('.sectioin-product-more .product-more__btn').click(function(e){
          if ($(this).hasClass('disableLoadMore')) {
              e.stopPropagation();
              return false;
          }
          else {
              loadmoreExecute();
              e.stopPropagation();
              return false;
          }
      });
  }
  function updateToolTip(){
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl)
    });
  }
  function ajaxFilterReview() {
    if (window.SPR && vela.settings.enableReview) {
      if ($('.shopify-product-reviews-badge').length > 0) {
        return window.SPR.registerCallbacks(), window.SPR.initRatingHandler(), window.SPR.initDomEls(), window.SPR.loadProducts(), window.SPR.loadBadges();
      };
    }
  }
  btnMoreEvent();
};
vela.accordion = function(){
  function accordionFooter(){
      if ( $(window).width() < 768 ){
          if(!$('.accordion-footer').hasClass('accordion')){
              $('.accordion-footer .footer__title').on('click', function(e){
                  $(this).toggleClass('active').parent().find('.accordion-footer__content').stop().slideToggle('medium');
                  e.preventDefault();
              });
              $('.accordion-footer').addClass('accordion').find('.accordion-footer__content').slideUp('fast');
          }
      }
      else {
          $('.accordion-footer .footer__title').removeClass('active').off().parent().find('.accordion-footer__content').removeAttr('style').slideDown('fast');
          $('.accordion-footer').removeClass('accordion');
      }
  }
  accordionFooter();
  $(window).resize(accordionFooter);
};
vela.gallery = function(){
  $('.gallery-image').magnificPopup({
    delegate: 'a',
    type: 'image',
    gallery: {
      enabled: true
    }
  });
};
vela.flytocart = function(){
  function flyToElement(flyer, flyingTo) {
      var divider = 3;
      var flyerClone = $(flyer).clone();
      flyerClone.removeClass();
      $(flyerClone).css({position: 'absolute', width: '360px', height: 'auto', top: $(flyer).offset().top + "px", left: $(flyer).offset().left + "px", opacity: 1, 'z-index': 10000});
      console.log($(flyerClone));
      $('body').append($(flyerClone));
      var gotoX = $(flyingTo).offset().left + ($(flyingTo).width() / 2) - ($(flyer).width()/divider)/2;
      var gotoY = $(flyingTo).offset().top + ($(flyingTo).height() / 2) - ($(flyer).height()/divider)/2;

      $(flyerClone).animate({
          opacity: 0.7,
          left: gotoX,
          top: gotoY,
          width: $(flyer).width()/divider,
          height: $(flyer).height()/divider
      }, 700,
      function () {
          $(flyingTo).fadeOut('fast', function () {
              $(flyingTo).fadeIn('fast', function () {
                  $(flyerClone).fadeOut('fast', function () {
                      $(flyerClone).remove();
                  });
              });
          });
      });
  }
  if (vela.settings.cartType == 'fly') {
    $('.form-addtocart button.btn--add-to-cart').on('click', function(e){
    e.preventDefault();
    $('html, body').animate({
              'scrollTop' : $("#cart-icon-bubble").position().top
          });
          var itemImg = $(this).parents('.proFlyBlock').find('.imgFlyCart');
          flyToElement($(itemImg), $('#cart-icon-bubble'));
    });
  }
};
vela.init = function() {
  vela.preLoading();
  vela.initializeEvents();
  vela.setBreakpoints();
  if(!$('body').hasClass('template-cart')) {
    vela.cartInit();
  }
  vela.slideshow();
  // vela.slickCarousel();
  vela.countdown();
  vela.cookieConsent();
  vela.newsletter();
  vela.customNumberInput();
  vela.accordion();
  vela.gallery();
  vela.productLoadMore(); 
  vela.swatchProduct();
  //vela.flytocart();
  if (vela.settings.enableQuickView) {
    new vela.QuickView('.js-quickview');
  }
};

$(document).ready(function() {
  vela.init();
  var sections = new vela.Sections();
});

var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl)
});
