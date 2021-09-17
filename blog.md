# The art of UI data binding

Memes about JavaScript frameworks poping in an out of existance every minute don't seem to die out. 

- interesting because JS frameworks look like they do something very simple
- you'd think we have exhausted all possible implementations by now

- But the explosion in number of frameworks is not random. It mirrors the depth and complexity of the problem, and shows that there are many many ways to solve it.

## What is a web UI

A UI is just some data rendered in the DOM, when things happen, the dom gets updated to look different.

```js
let username = 'John';

// Render something in the DOM
const element = document.createElement('div');
element.innerText = `Hello ${username}!`;
document.body.appendChild(element);

setTimeout(() => {
    // Update the DOM as a response to some stimulus
    element.innerText = `${username} is absent.`;
}, 10000);
```

That's it. That' all there is to building a user interface on the web. So what's this fuss all about?

Well rendering things is the easy part, what is difficult is to do it in a **safe**, **performant** and **sustainable** way.

If all you need to do is update some text every second, let me tell you that: **You don't need a framework for that**.

But if you are building a large application in a team with an agile workflow, **then you definitely need a framework**.

The example above can already give you a sense of the problem: What if I change `username`? Should the text be `Hello ${new_username}!` or should it be `${new_username} is absent`?
There is no way to tell because the logic for changing the username isn't really aware of the timeout logic, and it has no reason to be.

One might be tempted to write a quick solution as below, but that isn't going to stand the test of time.

```js
function changeUsername(newUsername) {
    // Extremely ugly and unmaintainable code right here 👇
    element.innerText = element.innerText.replace(username, newUsername);
    username = newUsername;
}
```

## Frameworks to the rescue

Most modern JS frameworks attempt to provide _at least_ the following features:

- Declarative data binding
- Automatic change detection

While they are clearly distinct, these two functionalities do have some overlap and people tend to confuse them. So let's see what they are exactly.


### Declarative data binding

In the previous example, we modified the content with the following statement:

```js
element.innerText = 'Are you still here?';
```

This statement links two things together: An event and an effect. The statement executes when the timeout fires (the event) and it modifies the content of the element (the effect).
As an application grows, there are more and more events, and more and more places which could be effected. The complexity grows in |number of events| x |number of views|. Soon you end up with a soup of function calls all over the place to link all events to their corresponding effects. The chances of finding a bug in here grow exponentially.

#### Model/view

One key concept before we introduce data binding is that of the model/view separation. There are countless MV* patterns out there (MVC, MVP, MVVM, ...) and to be quite frank I never really got my head around this soup of cryptic roman numerals.

However, one key characteristic which they all share is that **the model must be separate from the view**.

In our example, we could define the model like this:

```js
let model = {
    username: 'John',
    isTimeout: false
};
```

Then, we can write a function which _renders this model into the view_:

```js
function render(model) {
    if (model.isTimeout) {
        element.innerText =  `${model.username} is absent.`;
    } else {
        element.innerText =  `Hello ${model.username}!`;
    }
}
```

---

Now that we have a clear model/view separation, we can switch to the next gear with a declarative syntax.

Notice how in the example above, we use an imperative statement (`x = y`) to modify the view. It has an immediate effect but it doesn't describe the future state of the UI.

This can be a problem when our UI becomes more complex: The imperative code _assumes_ some previous state of the UI, and makes modifications according to this knowledge. In a complex UI, this can become unmanageable as the imperative code is going to need to check an increasing number of prerequisites (were we already on the admin screen? were we already showing the passwords tab? was the input field in focus before? ...).

UI developers have long noticed that this tedious work could be automated away. There is no need in 2021 for humans to write code like this. Humans should focus on describing what is the desired state of the UI and let the framework handle the rest.


UI frameworks typically provide some form of templating language used to describe the desired state:

```html
{{#if isTimeout}}
    <span><strong>{{username}}</strong> is absent.</span>
{{:else}}
    <span>Hello {{username}}!</span>
{{/if}}
```

Then, the code needs to bind this view to the model:

```js
const model = {
    username: 'John',
    isTimeout: false
};

const component = createView(template);

// Synchronize the view with the model
component.render(model);


model.username = 'Jimmy';
component.render(model);
```

We no longer have to care about the details of modifying the DOM, the framework takes care of this for us. We'll cover later how various frameworks perform this magic trick, but first lets' finish off the overview of the problems.

### Change detection

You may have noticed in the previous example that, even though we did not have to worry about low-level details of updating the view, we still had to manually call the `render` method.

Indeed, by default, there is no way for the view to know when the model has changed. In the example above we notified the view manually by calling `render`. But wouldn't it be nice if the framework could do that automatically for us?

> Enter change detection.

_Change detection_ is a broad and overloaded term, so for the purpose of this discussion, we will limit its definition to:

> A way for the view framework to regain control after the model was updated in order to update the view accordingly.

At a high level, we would want something like this:

```js
const model = {
    username: 'John',
    isTimeout: false
};

bindView(template, model);

model.username = 'Jimmy'; // component is automatically updated
```


---

The two properties described above are the essential features provided by any modern framework. As we will see, there are many ways to implement them, and this is part of the reason which explains why there are so many frameworks out there: Each one attempts to solve the problem in a different way.


## Overview of modern solutions

We can now dive into the interesting part of this post: How do major frameworks solve the above mentioned problems, and how do they differ from each other?

### React: Keep it simple

We start off by looking at how react solves this problem. The philosophy of the React framework is to be minimalist and out of the way. It is no surprise that React is perhaps the lowest-tech solution discussed in this article.

React doesn't use any trickery to obtain control. It simply waits until the programmer calls the framework.

In React, the state is owned by react itself:

```js

// In React, you CANNOT do this:
const state = { username: 'John', isTimeout: false };

// You HAVE TO create state through React such that it knows what you are doing
const [state, setState] = React.useState({ username: 'John', isTimeout: false });
```

Every time you modify state in react, you need to call back into the framework with `setState`:

```js
// Need to call into React to modify our state
setState({ ...state, username: 'Jimmy' })
```

Internally, React does something more or less like this:

```js
function setState(newState) {
    markComponentDirty(currentComponent);
    setComponentState(curretnCompoennt, newState);
}
```

The function `markComponentDirty` would schedule to redraw the component for the next frame.

```js
function markComponentDirty(component) {
    nextTick(() => {
        component.render();
    });
}
```

> Note: frameworks generally don't redraw stuff _immediately_. They take note that the component has changed, and then later redraw everything which has recently changed in a batch. This is not noticeable to the user but it saves some CPU: if setState is called many times in a row, the component will only re-render once with the final state.


### Angular: Bring out the big guns

If React represents one approach to UI engineering, Angular is the exact opposite of that. If React is a hand shovel, Angular is the [Bagger 288](https://en.wikipedia.org/wiki/Bagger_288).

The solution adopted by Angular starts with the following observation: The model can't change unless some code is running to change it.

However, in a JavaScript application, JavaScript code rarely runs at all. Most of the time, the runtime is sitting idle waiting for something to happen. When something happens, a JavaScript handler is invoked, it runs some logic then it exits and the runtime goes back to idling.

JavaScript code cannot run unless it is subscribed to events. It can be network requests, timeouts, user clicks, etc... It all starts with calls to native APIs.

And here is Angular's solution: If we instrument **every single native API**, then we can be notified whenever any user code runs at all!

Here is a quick example. Let's say we want to know when some code gets run as a result of a timeout:


```js
function enterZone(component) {
    // Swap setInterval for our own function
    window.setInterval = callback => {
        // Call the original function but wrap the user's callback with our own
        return originalInterval.call(window, wrapRuntimeCallback(callback, component));
    };
}

function wrapRuntimeCallback(callback, component) {
    return (...args) => {
        // We have obtained control!
        // Call the user's code
        callback(...args);
        // Then schedule to check for changes and re-render
        markComponentDirty(component);
    };
}

function leaveZone() {
    window.setInterval = originalInterval;
}
```

Angular has this concept of _Zones_. It can be difficult to grasp, but basically, when you are in a zone, your I/O entry points are hooked. Every time you call a function like `setTimeout`, the zone captures this call and istruments your callback.


A crude Angular implementation would work like that:

```js

function createComponent(Ctr) {
    enterZone(); // From now on, any I/O is going to be captured
    const component = new Ctr();
    component.init();
    component.render();
    leaveZone(); // Now we don't care what happens outside of the component.
}
```

If the component's `init` function initializes a timer:

```js
class MyComponent {

    username = 'John';

    init() {
        setTimeout(() => {
            this.username = 'Jimmy';
        }, 1000);
    }
}
```

Then, Angular is going to intercept this timeout and automatically re-render after the callback has run. It will look to the developper as if changing the `username` property magically caused the view to update, but in reality Angular would have triggered a re-render even if that property didn't change.

One last detail, the code above would lose control over the user's code in this scenario:

```js
class MyComponent {

    username = 'John';

    init() {
        initTimer();
    }

    initTimer() {
        setTimeout(() => {
            this.username = getRandomName();

            // Start a new timer.
            // But we are not currently in "the zone" so our Angular-ish framework will fail to capture the next timeout!
            initTimer();
        }, 1000);
    }
}
```

To handle these re-entries, it is essential to re-enter the zone before invoking the user's callback:

```js
function wrapRuntimeCallback(callback, component) {
    return (...args) => {
        // Don't forget to re-enter the zone, so we can capture if the callback makes new I/O calls.
        enterZone(component);
        callback(...args);
        leaveZone(component);

        markComponentDirty(component);
    };
}
```

And this is where Angular gets its reactivity from.


### Vue: High tech black magic

Vue's approach to change detection also involves some dark arts, but it isn't as bruteforce as Angular's (I mean, come on, what can possibly be more brutal than instrumenting the entire runtime?)

Like React, Vue requires the developer to declare the model _via_ the framework. Vue templates cannot be made reactive if they use arbitrary data like you could do in Angular.

Unlike React though, Vue doesn't require explicit calls back into the framework.


```js
var app = new Vue({
    data: {
        username: 'John'
    }
});

// This works as expected: the username displayed will change after 1 second.
setTimeout(() => {
    app.username = 'Jimmy';
}, 1000);
```

So if it's not instrumenting the runtime, and it doesn't require a call into a Vue API, how the hell does it know that username has changed? **What kind of sorcery is this?**

This my friend is the Proxy API.

[Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) is the final frontier in JavaScript fuckery. A proxy wraps an object and then it is able to capture virtually all usages made of this object!

For example, here's how we could capture all property accesses and property assignments of an object:

```js
const target = {
    username: 'John'
};

const proxy = new Proxy(target, {
    get(target, prop) {
        const value = Reflect.get(...arguments);
        console.log(`Property ${prop} was accessed. Its value is ${value}.`);
        return value;
    },
    set(target, prop, value) {
        console.log(`Property ${prop} was set to ${value}.`);
        return Reflect.set(...arguments);
    }
});


const username = proxy.username; // "Property username was accessed. Its value is John."
proxy.username = 'Jimmy'; // "Property username was set to Jimmy."
const dontCare = proxy.doesNotExist; // "Property doesNotExist was accessed. Its value is undefined."
```

Earlier, when we did `app.username = 'Jimmy'`, in reality we were calling into Vue's model proxy!

A function like this was triggered inside of the Vue framework:

```js
new Proxy(model, {
    set(target, prop, value) {
        // Our property assignment would run this function
        markComponentDirty(component);
        return Reflect.set(...arguments);
    }
});
```

Notice how, after all, **Vue is very close to React** in the way that it does change detection. It's just that in React the call is explicit...

```js
setState(...)
```

...whereas in Vue, the call is implicit.

```js
vue.foo = ...; // Implicitly calls proxy.set
```

What happens after that is fairly similar in both frameworks.


### Svelte

We cannot conclude this review without talking about the newest kid in the block: Svelte.

Svelte is particularly interesting because it brings yet another innovative approach to solve the same problem.

But in order to understand the value brought by Svelte, we must first address the elephant in the room: The virtual DOM.

#### To VDOM or not to VDOM?

In the first part of this blog post, I elluded the question of how exactly frameworks managed to turn a UI description into a set of imperative calls to the DOM APIs.

See, the problem when you describe the entire state of the app at once is that... you describe the entire state of the app at once! How is the framework supposed to know what has changed and what has not? A simple implementation would be to **replace all of the old content with the new one**, but it wouldn't work for at least the following reasons:

- It would be extremely inefficient
- CSS transitions and animations wouldn't work

Angular, React and Vue all solve this problem via a Virtual DOM.

A virtual DOM is a tree-like structure which represents the desired state of the document. The descriptive language (templates for Angular and Vue, JSX for React) doesn't directly map to the document, but instead it generates a virtual DOM (VDOM).

Frameworks always keep a copy of the last known VDOM in memory. When it is time to re-render, a new VDOM is generated. The framework then compares the two DOMs and figures out the optimal set of modifications required to go from the previous state to the next. This is known as "diffing". Finally, they apply the diff onto the real document.


---

So how is Svelte different?

While most frameworks do `model -> VDOM -> imperative instructions`, Svelte cuts the middleman and goes directly from model to imperative instructions: `model -> imperative instructions`.

It does this by **compiling components ahead of time**. While most frameworks treat the template as a black box (throw some data at it and see what comes back), svelte actually analyzes the template, and deduces how to mutate the DOM based on how variables are used inside the template.

It generates as an output optimized procedural code.

Essentially, complexity has been moved from the library into the compiler. This should in theory produce code which has a smaller memory footprint, is faster and more garbage-collector friendly (virtual DOMs are particularly nasty for garbage collectors).


Let's take the following example (note: Svelte uses its own syntax, but I demonstrate the principle here with a class as it's easier to follow):


```js
class SvelteComponent {

    private username = 'John';

    init() {
        setTimeout(() => {
            this.username = 'Jimmy';
        }, 1000);
    }

    render() {
        return <div>
            Hello <span>{this.username}</span>
        </div>;
    }
}
```

The compiler would turn it more or less into something like this:

```js
class SvelteComponent {

    private username = 'John';
    
    init() {
        setTimeout(() => {
            this.username = 'Jimmy';
            markComponentDirty(this);
        }, 1000);
    }

    // The render method is only invoked for the initial render
    renderFirstTime() {
        return component('div', {}, 
            "Hello",
            // Notice how it saves the component here!
            (this['$element1'] = component('span', {}, this.username))
        )
    }

    // The actual update function is imperative
    update() {
        this['$element1'].innerText = this.username;
    }
}
```

Notice how the generted code looks very similar to the naive examples we started with at the beginning of this blog post. An element is created, then its contents updated imperatively when the model changes. The Svelte compiler takes care of automating the boring parts away so you can focus on the useful code.


## Conclusion

We've barely scratched the surface of problems and solutions when designing UI frameworks. Hopefully this gives you an idea of the richness of this problem space and helps explain why there are so many new UI frameworks coming up these days.

I am personally excited about all this and I am looking forward to the next developments in this field. Is the V-DOM's current monopoly a durable one? Will compiler-based solutions catch on or remain a niche? What a time to be a web developer!
