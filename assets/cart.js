class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', (event) => {
      event.preventDefault();
      this.closest('cart-items').updateQuantity(this.dataset.index, 0);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();

    this.lineItemStatusElement = document.getElementById('shopping-cart-line-item-status');

    this.currentItemCount = Array.from(this.querySelectorAll('[name="updates[]"]')).reduce((total, quantityInput) => total + parseInt(quantityInput.value), 0);
    this.debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, 300);
    this.addEventListener('change', this.debouncedOnChange.bind(this));
    document.querySelectorAll('.js-btn-addgifcart').forEach((giftwrap) => giftwrap.addEventListener('click', this.addGifCart.bind(this)));
    this.enablePreOrder();
  }

  onChange(event) {
    this.updateQuantity(event.target.dataset.index, event.target.value, document.activeElement.getAttribute('name'));
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section'
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer').dataset.id,
        selector: '.js-contents1',
      }
    ];
  }

  updateQuantity(line, quantity, name) {
    this.enableLoading(line);
    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname
    });

    fetch(`${routes.cart_change_url}`, {...fetchConfig(), ...{ body }})
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        const html = new DOMParser().parseFromString(parsedState.sections[document.getElementById('main-cart-items').dataset.id], 'text/html');
        this.classList.toggle('is-empty', parsedState.item_count === 0);
        const cartFooter = document.getElementById('main-cart-footer');
        
        if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
        
        this.getSectionsToRender().forEach((section => {
          const elementToReplace = document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
          if(elementToReplace !="" ) elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
        }));
        const cart_gift = document.getElementById('ajaxcart__gift');
        if ( cart_gift ) {
            cart_gift.innerHTML = this.getSectionInnerHTML(parsedState.sections[document.getElementById('main-cart-items').dataset.id],'#ajaxcart__gift');
            document.querySelectorAll('.js-btn-addgifcart').forEach(
                (giftwrap) => giftwrap.addEventListener('click', this.addGifCart.bind(this))
            );
            this.enableGiftWrap(parsedState.items);
        }
        const shipingid = document.getElementById('shipping-bar');
        if ( shipingid) {
            shipingid.querySelector('.title-spend').innerHTML = this.getSectionInnerHTML(parsedState.sections[document.getElementById('main-cart-items').dataset.id],'.title-spend');
            shipingid.querySelector('.progress-bar').setAttribute('style', html.querySelector('.progress-bar').getAttribute('style'));
            this.shippingBar(parsedState.total_price);
        }
        this.updateLiveRegions(line, parsedState.item_count);
        const lineItem =  document.getElementById(`CartItem-${line}`);
        if (lineItem && lineItem.querySelector(`[name="${name}"]`)) lineItem.querySelector(`[name="${name}"]`).focus();
        this.enablePreOrder();
        this.disableLoading();
      }).catch(() => {
        this.querySelectorAll('.pre-loading').forEach((overlay) => overlay.classList.add('d-none'));
        this.disableLoading();
      });
      
  }

  updateLiveRegions(line, itemCount) {
    if (this.currentItemCount === itemCount) {
      document.getElementById(`Line-item-error-${line}`)
        .querySelector('.cart-item__error-text')
        .innerHTML = window.cartStrings.quantityError.replace(
          '[quantity]',
          document.getElementById(`Quantity-${line}`).value
        );
    }

    this.currentItemCount = itemCount;
    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus = document.getElementById('cart-live-region-text');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }
  addGifCart(event) {
    const target = event.currentTarget;
    const variant_id = target.getAttribute('data-variant-id');
    const body = JSON.stringify({
        id: Number(variant_id),
        quantity: 1,
        sections: this.getSectionsToRender().map((section) => section.section),
        sections_url: window.location.pathname
    });

    fetch(`${routes.cart_add_url}`, {...fetchConfig(), ...{ body }})
    .then((response) => {
      return response.text();
    })
    .then((state) => {
      const parsedState = JSON.parse(state);
      const html = new DOMParser().parseFromString(parsedState.sections[document.getElementById('main-cart-items').dataset.id], 'text/html');
      this.getSectionsToRender().forEach((section => {
        const elementToReplace = document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
        if(elementToReplace !="" ) elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
      }));
      const shipingid = document.getElementById('shipping-bar');
      if ( shipingid) {
        this.getSectionInnerHTML(parsedState.sections[document.getElementById('main-cart-items').dataset.id],'.title-spend')
          shipingid.querySelector('.title-spend').innerHTML = this.getSectionInnerHTML(parsedState.sections[document.getElementById('main-cart-items').dataset.id],'.title-spend');
          shipingid.querySelector('.progress-bar').setAttribute('style', html.querySelector('.progress-bar').getAttribute('style'));
          this.shippingBar(parsedState.total_price);
      }
      const giftButton = document.getElementById('ajaxcart__gift');
      giftButton.classList.add('d-none');
      this.enablePreOrder();
      this.shippingBar(parsedState.total_price);
      this.disableLoading();
    }).catch(() => {
        this.disableLoading();
    });
  }
  getSectionInnerHTML(html, selector) {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    document.getElementById('main-cart-items').classList.add('cart__items--disabled');
    this.querySelectorAll(`#CartItem-${line} .pre-loading`).forEach((overlay) => overlay.classList.remove('d-none'));
    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading() {
    document.getElementById('main-cart-items').classList.remove('cart__items--disabled');
  }
  enableGiftWrap (items){
    let giftButton = document.getElementById('ajaxcart__gift');
    let giftButtonHandle = giftButton.getAttribute('data-gift-variant_id');
    var giftHandle = false;
    items.forEach((item) => {
      let sentence = item.variant_id;
        if ( sentence == giftButtonHandle ) {
          giftHandle = true;
        }
      }
    );
    if( giftHandle ){
      giftButton.classList.add('d-none');
    } else {
      giftButton.classList.remove('d-none');
    }
  }
  enablePreOrder () {
    const nodeList = document.querySelectorAll('.cart-item__preorder');
    const nodeList1 = document.querySelectorAll('.pre_order__page-cart');
    for (let j = 0; j < nodeList1.length; j++) {
      var proOrderHandle = nodeList1[j].getAttribute("data-handle");
      for (let i = 0; i < nodeList.length; i++) {
        var proHandle = nodeList[i].getAttribute("data-handle");
        if ( proHandle == proOrderHandle ) {
          nodeList[i].classList.remove('d-none');
        }
      }
    }
  }
  shippingBar (totalPrice) {  
    const shipping_value_id = document.getElementById('shipping-bar');
    const shipping_value = shipping_value_id.getAttribute('data-shipping_value');
    if( (totalPrice >= shipping_value ) && shipping_value != 0){
      shipping_value_id.classList.add('effect','shipping-free');
      shipping_value_id.classList.remove('shipping-progress');
      setTimeout(function() {
        shipping_value_id.classList.remove('effect');
      },5000);
    }
    else {
      shipping_value_id.classList.remove('shipping-free');
      shipping_value_id.classList.add('shipping-progress');
    }
  };
}

customElements.define('cart-items', CartItems);
